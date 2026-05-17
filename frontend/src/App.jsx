import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:4000";

function App() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [newUserName, setNewUserName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberToAdd, setMemberToAdd] = useState("");

  const [activeUserId, setActiveUserId] = useState("");
  const [directReceiverId, setDirectReceiverId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [directMessage, setDirectMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");

  const [mode, setMode] = useState("direct");
  const [directHistory, setDirectHistory] = useState([]);
  const [groupHistory, setGroupHistory] = useState([]);

  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);

  const activeUser = useMemo(() => users.find((user) => user._id === activeUserId), [users, activeUserId]);
  const directReceivers = useMemo(() => users.filter((user) => user._id !== activeUserId), [users, activeUserId]);
  const directPeerId = directReceiverId || directReceivers[0]?._id || "";
  const activeGroupId = selectedGroupId || groups[0]?._id || "";
  const selectedGroup = useMemo(() => groups.find((group) => group._id === activeGroupId), [groups, activeGroupId]);
  const addableGroupUsers = useMemo(() => {
    if (!selectedGroup?.members) return [];
    const memberIds = new Set(selectedGroup.members.map((member) => member._id || member));
    return users.filter((user) => !memberIds.has(user._id));
  }, [users, selectedGroup]);

  const canSendDirect = Boolean(
    socketStatus === "Connected" &&
      activeUserId &&
      directPeerId &&
      directMessage.trim()
  );

  const canSendGroup = Boolean(
    socketStatus === "Connected" &&
      activeUserId &&
      activeGroupId &&
      groupMessage.trim()
  );

  const conversationMessages = mode === "direct" ? directHistory : groupHistory;

  function pushActivity(message) {
    const line = `${new Date().toLocaleTimeString()}: ${message}`;
    setActivity((prev) => [line, ...prev].slice(0, 20));
  }

  function normalizeMessage(raw) {
    return {
      ...raw,
      sender: raw.senderId || raw.sender || null,
      receiver: raw.receiverId || raw.receiver || null,
      group: raw.groupId || raw.group || null
    };
  }

  function getMessageKey(item) {
    return item._id || `${item.chatType}-${item.sender?._id || "na"}-${item.receiver?._id || "na"}-${item.group?._id || "na"}-${item.message}-${item.createdAt}`;
  }

  function upsertMessage(list, message) {
    const key = getMessageKey(message);
    if (list.some((item) => getMessageKey(item) === key)) {
      return list;
    }
    return [...list, message];
  }

  function formatDayLabel(isoDate) {
    if (!isoDate) return "Unknown date";
    const date = new Date(isoDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today - targetDay) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatTime(isoDate) {
    if (!isoDate) return "";
    return new Date(isoDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Server returned an invalid JSON response");
    }

    if (!response.ok || !data.success) {
      throw new Error(data?.message || `Request failed (${response.status})`);
    }

    return data.data;
  }

  async function loadInitialData() {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedGroups] = await Promise.all([
        api("/api/chat/users"),
        api("/api/chat/groups")
      ]);

      setUsers(fetchedUsers);
      setGroups(fetchedGroups);

      if (fetchedUsers.length > 0) {
        setActiveUserId((prev) => prev || fetchedUsers[0]._id);
      }

      if (fetchedUsers.length > 1) {
        setDirectReceiverId((prev) => prev || fetchedUsers[1]._id);
      }

      if (fetchedGroups.length > 0) {
        setSelectedGroupId((prev) => prev || fetchedGroups[0]._id);
      }
    } catch (error) {
      pushActivity(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event) {
    event.preventDefault();
    const name = newUserName.trim();

    if (!name) {
      pushActivity("Enter a user name first");
      return;
    }

    setLoading(true);
    try {
      const user = await api("/api/chat/users", {
        method: "POST",
        body: JSON.stringify({ name })
      });

      setUsers((prev) => [...prev, user]);
      setNewUserName("");

      if (!activeUserId) {
        setActiveUserId(user._id);
      }

      pushActivity(`User created: ${user.name}`);
    } catch (error) {
      pushActivity(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createGroup(event) {
    event.preventDefault();

    const name = newGroupName.trim();
    const creatorId = activeUserId;
    const memberIds = Array.from(new Set([...groupMembers, creatorId])).filter(Boolean);

    if (!name) {
      pushActivity("Enter a group name first");
      return;
    }

    if (!creatorId) {
      pushActivity("Select active sender to create a group");
      return;
    }

    if (memberIds.length < 2) {
      pushActivity("Pick at least 2 group members");
      return;
    }

    setLoading(true);
    try {
      const group = await api("/api/chat/groups", {
        method: "POST",
        body: JSON.stringify({ name, memberIds, createdBy: creatorId })
      });

      const hydratedGroup = {
        ...group,
        members: users.filter((user) => memberIds.includes(user._id)),
        createdBy: users.find((user) => user._id === creatorId) || creatorId
      };

      setGroups((prev) => [...prev, hydratedGroup]);
      setSelectedGroupId(group._id);
      setNewGroupName("");
      setGroupMembers([]);
      setMode("group");
      pushActivity(`Group created: ${group.name}`);
    } catch (error) {
      pushActivity(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addMemberToGroup() {
    if (!activeGroupId || !memberToAdd) {
      pushActivity("Select group and user to add");
      return;
    }

    try {
      const updatedGroup = await api(`/api/chat/groups/${activeGroupId}/members`, {
        method: "PATCH",
        body: JSON.stringify({ userId: memberToAdd })
      });

      setGroups((prev) => prev.map((group) => (group._id === updatedGroup._id ? updatedGroup : group)));
      const addedUser = users.find((user) => user._id === memberToAdd);
      setMemberToAdd("");
      pushActivity(`${addedUser?.name || "User"} added successfully`);
    } catch (error) {
      pushActivity(error.message);
    }
  }

  async function loadDirectMessages() {
    if (!activeUserId || !directPeerId) {
      pushActivity("Select sender and direct receiver");
      return;
    }

    try {
      const data = await api(`/api/chat/messages/direct?userAId=${activeUserId}&userBId=${directPeerId}`);
      setDirectHistory(data.map(normalizeMessage));
      setMode("direct");
      pushActivity("Direct history loaded");
    } catch (error) {
      pushActivity(error.message);
    }
  }

  async function loadGroupMessages() {
    if (!activeGroupId) {
      pushActivity("Select a group first");
      return;
    }

    try {
      const data = await api(`/api/chat/messages/group/${activeGroupId}`);
      setGroupHistory(data.map(normalizeMessage));
      setMode("group");
      pushActivity("Group history loaded");
    } catch (error) {
      pushActivity(error.message);
    }
  }

  function sendDirectMessage(event) {
    event.preventDefault();

    if (!canSendDirect) {
      pushActivity("Cannot send direct message. Check sender, receiver, socket, and message.");
      return;
    }

    socketRef.current?.send(
      JSON.stringify({
        event: "direct_message",
        data: {
          senderId: activeUserId,
          receiverId: directPeerId,
          message: directMessage.trim()
        }
      })
    );

    setDirectMessage("");
    setMode("direct");
  }

  function sendGroupMessage(event) {
    event.preventDefault();

    if (!canSendGroup) {
      pushActivity("Cannot send group message. Check sender, group, socket, and message.");
      return;
    }

    socketRef.current?.send(
      JSON.stringify({
        event: "group_message",
        data: {
          senderId: activeUserId,
          groupId: activeGroupId,
          message: groupMessage.trim()
        }
      })
    );

    setGroupMessage("");
    setMode("group");
  }

  function swapDirectUsers() {
    if (!directPeerId) return;
    const previousSender = activeUserId;
    setActiveUserId(directPeerId);
    setDirectReceiverId(previousSender);
    setMode("direct");
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_BASE);
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketStatus("Connected");
      pushActivity("WebSocket connected");
    };

    socket.onclose = () => {
      setSocketStatus("Disconnected");
      pushActivity("WebSocket disconnected");
    };

    socket.onerror = () => {
      pushActivity("WebSocket error occurred");
    };

    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        pushActivity("Invalid socket payload received");
        return;
      }

      const { type, data, message } = payload;

      if (type === "direct_message_received" || type === "direct_message_sent") {
        const normalized = normalizeMessage(data);
        setDirectHistory((prev) => upsertMessage(prev, normalized));
      }

      if (type === "group_message_received" || type === "group_message_sent") {
        const normalized = normalizeMessage(data);
        setGroupHistory((prev) => upsertMessage(prev, normalized));
      }

      pushActivity(message || type);
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(
      JSON.stringify({ event: "register", data: { userId: activeUserId } })
    );

    pushActivity(`Registered socket for ${activeUser?.name || activeUserId}`);
  }, [activeUserId, activeUser, socketStatus]);

  useEffect(() => {
    if (activeUserId && directPeerId) {
      loadDirectMessages();
    }
  }, [activeUserId, directPeerId]);

  useEffect(() => {
    if (activeGroupId) {
      loadGroupMessages();
    }
  }, [activeGroupId]);
  const conversationRows = useMemo(() => {
    const rows = [];
    let previousDay = "";
    conversationMessages.forEach((item) => {
      const day = formatDayLabel(item.createdAt);
      if (day !== previousDay) {
        rows.push({ type: "day", label: day, key: `day-${day}-${item.createdAt}` });
        previousDay = day;
      }
      rows.push({ type: "message", item, key: getMessageKey(item) });
    });
    return rows;
  }, [conversationMessages]);

  return (
    <main className="chat-app">
      <aside className="chat-sidebar">
        <h1>Realtime Chat</h1>
        <p className="subtitle">Direct + group chat with REST history and WebSocket live updates.</p>

        <div className={`status ${socketStatus === "Connected" ? "ok" : "down"}`}>
          Socket: {socketStatus}
        </div>

        <section className="card">
          <h2>Create user</h2>
          <form onSubmit={createUser} className="stack">
            <input
              value={newUserName}
              onChange={(event) => setNewUserName(event.target.value)}
              placeholder="User name"
            />
            <button type="submit" disabled={loading}>Add user</button>
          </form>
        </section>

        <section className="card">
          <h2>Create group</h2>
          <form onSubmit={createGroup} className="stack">
            <input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Group name"
            />
            <div className="member-grid">
              {users.map((user) => (
                <label key={user._id}>
                  <input
                    type="checkbox"
                    checked={groupMembers.includes(user._id)}
                    onChange={() =>
                      setGroupMembers((prev) =>
                        prev.includes(user._id)
                          ? prev.filter((id) => id !== user._id)
                          : [...prev, user._id]
                      )
                    }
                  />
                  {user.name}
                </label>
              ))}
            </div>
            <button type="submit" disabled={loading || !newGroupName.trim() || users.length < 2}>
              Create group
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Activity</h2>
          <div className="activity-feed">
            {activity.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
        </section>
      </aside>

      <section className="chat-main">
        <div className="toolbar">
          <select
            value={activeUserId}
            onChange={(event) => {
              setActiveUserId(event.target.value);
              setMode("direct");
            }}
          >
            <option value="">Choose active sender</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>

          <div className="mode-switch">
            <button
              type="button"
              className={mode === "direct" ? "active" : ""}
              onClick={() => setMode("direct")}
            >
              Direct
            </button>
            <button
              type="button"
              className={mode === "group" ? "active" : ""}
              onClick={() => setMode("group")}
            >
              Group
            </button>
          </div>

          <select
            value={directPeerId}
            onChange={(event) => {
              setDirectReceiverId(event.target.value);
              setMode("direct");
            }}
          >
            <option value="">Choose direct receiver</option>
            {directReceivers.map((user) => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>
          <button type="button" onClick={swapDirectUsers} disabled={!activeUserId || !directPeerId}>
            Swap users
          </button>

          <select
            value={activeGroupId}
            onChange={(event) => {
              setSelectedGroupId(event.target.value);
              setMode("group");
            }}
          >
            <option value="">Choose group</option>
            {groups.map((group) => (
              <option key={group._id} value={group._id}>{group.name}</option>
            ))}
          </select>

          <select value={memberToAdd} onChange={(event) => setMemberToAdd(event.target.value)} disabled={!activeGroupId}>
            <option value="">Add member to group</option>
            {addableGroupUsers.map((user) => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>

          <button type="button" onClick={addMemberToGroup} disabled={!activeGroupId || !memberToAdd}>
            Add user
          </button>
        </div>

        <header className="conversation-header">
          <h2>
            {mode === "direct"
              ? `Direct chat: ${activeUser?.name || "-"} -> ${users.find((u) => u._id === directPeerId)?.name || "-"}`
              : `Group chat: ${selectedGroup?.name || "No group selected"}`}
          </h2>
          {mode === "group" && selectedGroup?.members ? (
            <p>
              Members: {selectedGroup.members.map((member) => member.name || member).join(", ")}
            </p>
          ) : null}
        </header>

        <div className="conversation-body">
          {conversationMessages.length === 0 ? (
            <div className="empty-state">No messages yet. Send one or load history.</div>
          ) : (
            conversationRows.map((row) => {
              if (row.type === "day") {
                return <div key={row.key} className="day-separator">{row.label}</div>;
              }

              const item = row.item;
              const senderName = item.sender?.name || "Unknown";
              const mine = item.sender?._id === activeUserId;

              return (
                <article key={row.key} className={mine ? "mine" : "other"}>
                  <h4>{senderName}</h4>
                  <p>{item.message}</p>
                  <time>{formatTime(item.createdAt)}</time>
                </article>
              );
            })
          )}
        </div>

        <div className="composer-wrap">
          <form onSubmit={sendDirectMessage} className="composer" hidden={mode !== "direct"}>
            <input
              value={directMessage}
              onChange={(event) => setDirectMessage(event.target.value)}
              placeholder="Type direct message"
            />
            <button type="submit" disabled={!canSendDirect}>Send direct</button>
          </form>

          <form onSubmit={sendGroupMessage} className="composer" hidden={mode !== "group"}>
            <input
              value={groupMessage}
              onChange={(event) => setGroupMessage(event.target.value)}
              placeholder="Type group message"
            />
            <button type="submit" disabled={!canSendGroup}>Send group</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default App;
