import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { noteKey, noteTag, type Note } from "./model";
import type { NotesPage, NotesWorkspace } from "./workspace";

/** Both document surfaces retain only the loaded, currently readable catalogue. */
export function useNotesCollection(workspace: NotesWorkspace) {
  const current = useRef<NotesPage>({ notes: [], creators: {}, more: false });
  const [collection, publish] = useState(current.current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listing = useRef<AbortController | undefined>(undefined);
  const reading = useRef(new Map<string, AbortController>());
  const revoked = useRef(new Set<string>());
  const setCollection = useCallback(
    (change: (page: NotesPage) => NotesPage) => {
      current.current = change(current.current);
      publish(current.current);
    },
    [],
  );
  const cancelLoad = useCallback(() => {
    listing.current?.abort();
    setLoading(false);
  }, []);
  const remove = useCallback(
    (channels: readonly string[]) => {
      if (
        current.current.notes.some((note) => channels.includes(note.channel)) ||
        channels.some((channel) => channel in current.current.creators)
      )
        cancelLoad();
      for (const channel of channels) {
        revoked.current.add(channel);
        reading.current.get(channel)?.abort();
      }
      setCollection((old) => ({
        ...old,
        creators: Object.fromEntries(
          Object.entries(old.creators).filter(
            ([channel]) => !channels.includes(channel),
          ),
        ),
        notes: old.notes.filter((note) => !channels.includes(note.channel)),
      }));
    },
    [cancelLoad, setCollection],
  );
  const changed = useCallback(
    (note: Note) => {
      if (revoked.current.has(note.channel)) return;
      const previous = current.current.notes.find(
        (item) => noteKey(item) === noteKey(note),
      );
      if (previous?.revision === note.revision) return;
      reading.current.get(note.channel)?.abort();
      if (previous) cancelLoad();
      setCollection((old) => ({
        ...old,
        notes: [
          note,
          ...old.notes.filter((item) => noteKey(item) !== noteKey(note)),
        ],
      }));
    },
    [cancelLoad, setCollection],
  );
  const load = useCallback(
    async (more = false) => {
      listing.current?.abort();
      if (!more) {
        for (const request of reading.current.values()) request.abort();
        reading.current.clear();
      }
      const controller = new AbortController();
      listing.current = controller;
      setLoading(true);
      setError("");
      try {
        const page = await workspace.list(
          more ? current.current.cursor : undefined,
          controller.signal,
        );
        // Discovery reads do not populate the host's hidden-channel routes.
        // Resolve this page in one batch before retaining/following its content.
        const ids = [
          ...new Set([
            ...Object.keys(page.creators),
            ...page.notes.map((note) => note.channel),
          ]),
        ];
        if (ids.length)
          await workspace.session.channels.resolve?.(ids, {
            signal: controller.signal,
            consistency: "strong",
          });
        controller.signal.throwIfAborted();
        page.notes = page.notes.filter(
          (note) => !!workspace.session.channels.get?.(note.channel),
        );
        page.creators = Object.fromEntries(
          Object.entries(page.creators).filter(
            ([channel]) => !!workspace.session.channels.get?.(channel),
          ),
        );
        for (const note of page.notes) revoked.current.delete(note.channel);
        setCollection((old) => ({
          ...page,
          creators: more
            ? { ...old.creators, ...page.creators }
            : page.creators,
          notes: more
            ? [
                ...new Map(
                  [...old.notes, ...page.notes].map((note) => [
                    noteKey(note),
                    note,
                  ]),
                ).values(),
              ]
            : page.notes,
        }));
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Docs could not be read.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [workspace, setCollection],
  );
  useEffect(() => {
    void load();
    const requests = reading.current;
    return () => {
      listing.current?.abort();
      for (const request of requests.values()) request.abort();
      requests.clear();
    };
  }, [load]);
  const channels = [
    ...new Set([
      ...Object.keys(collection.creators),
      ...collection.notes.map((note) => note.channel),
    ]),
  ]
    .sort()
    .join(":");
  useLayoutEffect(() => {
    if (!channels) return;
    const requests = reading.current;
    const stop = workspace.session.artifacts.follow(
      channels.split(":"),
      (events) => {
        const affected = new Set(
          events
            .filter(
              (event) =>
                event.kind !== 45010 ||
                !current.current.notes.some(
                  (note) => note.revision === event.id,
                ),
            )
            .map((event) => noteTag(event, event.kind === 45010 ? "h" : "d")),
        );
        for (const note of current.current.notes) {
          if (!affected.has(note.channel) || revoked.current.has(note.channel))
            continue;
          cancelLoad();
          requests.get(note.channel)?.abort();
          const controller = new AbortController();
          requests.set(note.channel, controller);
          void workspace
            .open(note, controller.signal)
            .then((head) => {
              controller.signal.throwIfAborted();
              requests.delete(note.channel);
              if (
                current.current.notes.some(
                  (item) => noteKey(item) === noteKey(head),
                )
              )
                changed(head);
            })
            .catch(() => {
              if (!controller.signal.aborted) remove([note.channel]);
            });
        }
      },
      remove,
    );
    // Revocation may precede this subscription; follow reports future losses.
    const denied = channels
      .split(":")
      .filter((channel) => !workspace.session.channels.get?.(channel));
    if (denied.length) remove(denied);
    return stop;
  }, [workspace, channels, cancelLoad, changed, remove]);
  return { collection, setCollection, loading, error, load, changed, remove };
}
