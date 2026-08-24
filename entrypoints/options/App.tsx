/**
 * @fileoverview Renders the Better Canvas View dashboard from durable local data.
 */

import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Image,
  Modal,
  Paper,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

import type { AgendaItemRecord, ItemState } from "../../src/domain/models";
import {
  selectAnnouncementsByCourse,
  selectHiddenAnnouncements,
  selectHiddenItems,
  selectNonEmptyAgendaBuckets,
  selectVisibleAgendaItems,
  shouldShowStaleWarning,
} from "../../src/dashboard/selectors";
import {
  formatPacificDateTime,
  formatPacificDueAt,
} from "../../src/dashboard/formatters";
import type { SyncResult } from "../../src/sync/sync-service";
import { CanvasDatabase } from "../../src/storage/database";
import {
  clearAllData,
  saveCoursePreference,
  saveItemState,
} from "../../src/storage/repository";
import { getTrustedCanvasUrl } from "../../src/security/canvas-links";

const CANVAS_HOME = "https://sjsu.instructure.com/";
const REFRESH_SUCCESS_VISIBLE_MS = 4_000;

interface AppProps {
  database: CanvasDatabase;
  now_fn: () => Date;
  send_message: (message: { type: "RUN_CANVAS_SYNC" }) => Promise<SyncResult>;
}

interface AgendaFilters {
  course_ids: string[];
  title_query: string;
}

/** Resolves persisted local state with a safe default for new agenda items. */
function itemStateFor(itemId: string, itemStates: ItemState[]): ItemState {
  return (
    itemStates.find(({ id }) => id === itemId) ?? {
      id: itemId,
      hidden: false,
      note: "",
    }
  );
}

/** Displays the course, metadata, trusted link, and local controls for work. */
function AgendaRow({
  item,
  courseName,
  itemState,
  note,
  onHideChange,
  onNoteChange,
}: {
  item: AgendaItemRecord;
  courseName: string;
  itemState: ItemState;
  note: string;
  onHideChange: (hidden: boolean) => void;
  onNoteChange: (value: string) => void;
}): React.JSX.Element {
  const link = getTrustedCanvasUrl(item.html_url);
  const points =
    item.points_possible === null
      ? "Points unavailable"
      : `${item.points_possible} points`;

  return (
    <Paper className="dashboard-row" p="sm" withBorder>
      <Stack gap="xs">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <div>
            <Text c="dimmed" size="xs">
              {courseName}
            </Text>
            {link === null ? (
              <Text fw={600}>{item.title}</Text>
            ) : (
              <Anchor href={link} rel="noreferrer" target="_blank" fw={600}>
                {item.title}
              </Anchor>
            )}
          </div>
          <Checkbox
            aria-label={`Hide ${item.title}`}
            checked={itemState.hidden}
            label="Hide"
            onChange={(event) => onHideChange(event.currentTarget.checked)}
          />
        </Group>
        <Text size="sm">{formatPacificDueAt(item.due_at)}</Text>
        <Text c="dimmed" size="sm">
          {points} · {item.item_type}
        </Text>
        <Group align="end" wrap="nowrap">
          <TextInput
            aria-label={`Note for ${item.title}`}
            className="note-input"
            label="Note"
            value={note}
            onChange={(event) => onNoteChange(event.currentTarget.value)}
          />
        </Group>
      </Stack>
    </Paper>
  );
}

/** Renders the extension's durable, local-only Canvas dashboard. */
export function App({
  database,
  now_fn,
  send_message,
}: AppProps): React.JSX.Element {
  const courses = useLiveQuery(
    () => database.courses.toArray(),
    [database],
    [],
  );
  const agendaItems = useLiveQuery(
    () => database.agenda_items.toArray(),
    [database],
    [],
  );
  const announcements = useLiveQuery(
    () => database.announcements.toArray(),
    [database],
    [],
  );
  const preferences = useLiveQuery(
    () => database.course_preferences.toArray(),
    [database],
    [],
  );
  const itemStates = useLiveQuery(
    () => database.item_states.toArray(),
    [database],
    [],
  );
  const metadata = useLiveQuery(
    () => database.sync_metadata.get("current"),
    [database],
    null,
  );
  const [titleQuery, setTitleQuery] = useState<string>("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState<boolean>(false);
  const dashboardNow = now_fn();
  const filters: AgendaFilters = {
    course_ids: selectedCourseIds,
    title_query: titleQuery,
  };
  const visibleItems = selectVisibleAgendaItems(
    agendaItems,
    preferences,
    itemStates,
    filters,
  );
  const hiddenItems = selectHiddenItems(agendaItems, preferences, itemStates);
  const hiddenAnnouncements = selectHiddenAnnouncements(
    courses,
    preferences,
    announcements,
    itemStates,
    dashboardNow,
  );
  const agendaBuckets = selectNonEmptyAgendaBuckets(visibleItems, dashboardNow);
  const announcementGroups = selectAnnouncementsByCourse(
    courses,
    preferences,
    announcements,
    itemStates,
    dashboardNow,
  );
  const courseNameById = new Map(
    courses.map((course) => [course.course_id, course.name]),
  );
  const dataIsStale = shouldShowStaleWarning(metadata, dashboardNow);

  useEffect(() => {
    if (refreshStatus !== "Refresh complete") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRefreshStatus(null);
    }, REFRESH_SUCCESS_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [refreshStatus]);

  function toggleCourseFilter(courseId: string, checked: boolean): void {
    setSelectedCourseIds((currentIds) => {
      if (currentIds.length === 0) {
        return courses
          .map((course) => course.course_id)
          .filter((id) => id !== courseId);
      }

      return checked
        ? [...currentIds, courseId]
        : currentIds.filter((id) => id !== courseId);
    });
  }

  async function setItemHidden(
    item: AgendaItemRecord,
    hidden: boolean,
  ): Promise<void> {
    const state = itemStateFor(item.id, itemStates);
    await saveItemState(database, item.id, { hidden, note: state.note });
  }

  async function setAnnouncementHidden(
    announcementId: string,
    hidden: boolean,
  ): Promise<void> {
    const state = itemStateFor(announcementId, itemStates);
    await saveItemState(database, announcementId, { hidden, note: state.note });
  }

  async function saveNote(item: AgendaItemRecord): Promise<void> {
    const state = itemStateFor(item.id, itemStates);
    await saveItemState(database, item.id, {
      hidden: state.hidden,
      note: noteDrafts[item.id] ?? state.note,
    });
    setNoteDrafts((drafts) => {
      const remainingDrafts = { ...drafts };
      delete remainingDrafts[item.id];
      return remainingDrafts;
    });
  }

  async function saveNotes(): Promise<void> {
    const itemsById = new Map(agendaItems.map((item) => [item.id, item]));
    await Promise.all(
      Object.keys(noteDrafts).map(async (itemId) => {
        const item = itemsById.get(itemId);
        if (item !== undefined) {
          await saveNote(item);
        }
      }),
    );
  }

  async function refresh(): Promise<void> {
    setIsRefreshing(true);
    setRefreshStatus(null);
    try {
      const result = await send_message({ type: "RUN_CANVAS_SYNC" });
      setRefreshStatus(
        result.status === "success" ? "Refresh complete" : "Refresh failed",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function confirmClearData(): Promise<void> {
    await clearAllData(database);
    setClearDialogOpen(false);
  }

  return (
    <Container component="main" size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm" wrap="nowrap">
            <Image
              alt="Better Canvas View icon"
              height={48}
              src="/icon-48.png"
              width={48}
            />
            <div>
              <Title order={1}>Better Canvas View</Title>
              <Text c="dimmed" size="sm">
                Your local Canvas agenda
              </Text>
            </div>
          </Group>
          <Button
            type="button"
            loading={isRefreshing}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </Group>
        {refreshStatus !== null && (
          <Alert
            color={refreshStatus === "Refresh complete" ? "green" : "red"}
            role="status"
          >
            {refreshStatus}
          </Alert>
        )}
        {dataIsStale && (
          <Alert color="yellow" role="alert" title="Data may be stale">
            <Group gap="xs">
              <Text>Data may be stale.</Text>
              <Anchor href={CANVAS_HOME} rel="noreferrer" target="_blank">
                Open Canvas to Sign In
              </Anchor>
            </Group>
          </Alert>
        )}
        <Tabs defaultValue="agenda">
          <Tabs.List>
            <Tabs.Tab value="agenda">Agenda</Tabs.Tab>
            <Tabs.Tab value="announcements">Announcements</Tabs.Tab>
            <Tabs.Tab value="hidden-items">Hidden Items</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="agenda" pt="md">
            <Stack gap="md">
              <Paper p="sm" withBorder>
                <Stack gap="xs">
                  <TextInput
                    aria-label="Search agenda"
                    placeholder="Search agenda"
                    type="search"
                    value={titleQuery}
                    onChange={(event) =>
                      setTitleQuery(event.currentTarget.value)
                    }
                  />
                  <Group gap="md">
                    {courses.map((course) => (
                      <Checkbox
                        key={course.id}
                        checked={
                          selectedCourseIds.length === 0 ||
                          selectedCourseIds.includes(course.course_id)
                        }
                        label={course.name}
                        onChange={(event) =>
                          toggleCourseFilter(
                            course.course_id,
                            event.currentTarget.checked,
                          )
                        }
                      />
                    ))}
                  </Group>
                </Stack>
              </Paper>
              {agendaBuckets.map((bucket) => (
                <section key={bucket.id} aria-label={bucket.label}>
                  <Title order={2} size="h4" mb="xs">
                    {bucket.label}
                  </Title>
                  <Stack gap="xs">
                    {bucket.items.map((item) => {
                      const state = itemStateFor(item.id, itemStates);
                      return (
                        <AgendaRow
                          key={item.id}
                          courseName={
                            courseNameById.get(item.course_id) ??
                            "Unknown course"
                          }
                          item={item}
                          itemState={state}
                          note={noteDrafts[item.id] ?? state.note}
                          onHideChange={(hidden) =>
                            void setItemHidden(item, hidden)
                          }
                          onNoteChange={(note) =>
                            setNoteDrafts((drafts) => ({
                              ...drafts,
                              [item.id]: note,
                            }))
                          }
                        />
                      );
                    })}
                  </Stack>
                </section>
              ))}
              <Button
                type="button"
                variant="default"
                onClick={() => void saveNotes()}
              >
                Save
              </Button>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="announcements" pt="md">
            <Stack gap="md">
              {announcementGroups.map(
                ({ course, announcements: courseAnnouncements }) => (
                  <Paper
                    key={course.id}
                    component="section"
                    aria-label={`${course.name} announcements`}
                    p="sm"
                    withBorder
                  >
                    <Stack gap="xs">
                      <Title order={2} size="h4">
                        {course.name}
                      </Title>
                      {courseAnnouncements.map((announcement) => {
                        const link = getTrustedCanvasUrl(announcement.html_url);
                        return (
                          <div key={announcement.id}>
                            <Group
                              align="flex-start"
                              justify="space-between"
                              wrap="nowrap"
                            >
                              <div>
                                {link === null ? (
                                  <Text fw={600}>{announcement.title}</Text>
                                ) : (
                                  <Anchor
                                    href={link}
                                    rel="noreferrer"
                                    target="_blank"
                                    fw={600}
                                  >
                                    {announcement.title}
                                  </Anchor>
                                )}
                                <Text c="dimmed" size="xs">
                                  {formatPacificDateTime(
                                    announcement.posted_at,
                                  )}
                                </Text>
                              </div>
                              <Checkbox
                                aria-label={`Hide ${announcement.title}`}
                                checked={false}
                                onChange={(event) =>
                                  void setAnnouncementHidden(
                                    announcement.id,
                                    event.currentTarget.checked,
                                  )
                                }
                              />
                            </Group>
                            <Text>{announcement.excerpt}</Text>
                          </div>
                        );
                      })}
                    </Stack>
                  </Paper>
                ),
              )}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="hidden-items" pt="md">
            <Stack gap="md">
              {hiddenItems.length === 0 && hiddenAnnouncements.length === 0 && (
                <Text c="dimmed">No hidden items.</Text>
              )}
              {hiddenItems.length > 0 && (
                <Stack gap="xs">
                  <Title order={2} size="h5">
                    Hidden Assignments
                  </Title>
                  {hiddenItems.map((item) => (
                    <Paper
                      key={item.id}
                      className="dashboard-row"
                      p="sm"
                      withBorder
                    >
                      <Group justify="space-between">
                        <div>
                          <Text c="dimmed" size="xs">
                            {courseNameById.get(item.course_id) ??
                              "Unknown course"}
                          </Text>
                          <Text fw={600}>{item.title}</Text>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => void setItemHidden(item, false)}
                        >{`Restore ${item.title}`}</Button>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
              {hiddenAnnouncements.length > 0 && (
                <Stack gap="xs">
                  <Title order={2} size="h5">
                    Hidden Announcements
                  </Title>
                  {hiddenAnnouncements.map((announcement) => (
                    <Paper
                      key={announcement.id}
                      className="dashboard-row"
                      p="sm"
                      withBorder
                    >
                      <Group justify="space-between">
                        <div>
                          <Text c="dimmed" size="xs">
                            {announcement.courseName}
                          </Text>
                          <Text fw={600}>{announcement.title}</Text>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          onClick={() =>
                            void setAnnouncementHidden(announcement.id, false)
                          }
                        >{`Restore ${announcement.title}`}</Button>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="settings" pt="md">
            <Stack gap="md">
              <Paper p="sm" withBorder>
                <Stack gap="xs">
                  <Title order={2} size="h4">
                    Courses
                  </Title>
                  {courses.map((course) => {
                    const preference = preferences.find(
                      ({ id }) => id === course.id,
                    );
                    return (
                      <Checkbox
                        key={course.id}
                        checked={preference?.enabled ?? true}
                        label={course.name}
                        onChange={(event) =>
                          void saveCoursePreference(
                            database,
                            course.id,
                            event.currentTarget.checked,
                          )
                        }
                      />
                    );
                  })}
                </Stack>
              </Paper>
              <Divider />
              <Button
                color="red"
                type="button"
                variant="outline"
                onClick={() => setClearDialogOpen(true)}
              >
                Clear Data
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
      <Modal
        aria-label="Clear all data?"
        opened={clearDialogOpen}
        title="Clear all data?"
        transitionProps={{ duration: 0 }}
        onClose={() => setClearDialogOpen(false)}
      >
        <Stack gap="sm">
          <Text fw={600}>Clear all data?</Text>
          <Text size="sm">
            This removes the local Canvas cache and preferences.
          </Text>
          <Group justify="flex-end">
            <Button
              type="button"
              variant="default"
              onClick={() => setClearDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              type="button"
              onClick={() => void confirmClearData()}
            >
              Confirm Clear Data
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
