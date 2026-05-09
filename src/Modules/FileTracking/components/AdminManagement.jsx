import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    Divider,
    Group,
    Modal,
    Select,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput,
    Textarea,
    Title,
    Switch,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    createAdminUser,
    deactivateAdminUser,
    listAdminAuditLogs,
    listAdminPolicies,
    listAdminUsers,
    listDesignations,
    updateAdminPolicies,
    updateAdminUser,
} from "../api";
import { getApiErrorMessage } from "../utils/apiErrors";

const DEFAULT_CREATE_FORM = {
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    designation_names: [],
};

export default function AdminManagement() {
    const token = localStorage.getItem("authToken");

    const [users, setUsers] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [logs, setLogs] = useState([]);
    const [policies, setPolicies] = useState([]);

    const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
    const [newPolicyKey, setNewPolicyKey] = useState("");
    const [newPolicyValue, setNewPolicyValue] = useState("{}");
    const [selectedUser, setSelectedUser] = useState(null);
    const [editRoles, setEditRoles] = useState([]);
    const [editIsStaff, setEditIsStaff] = useState(false);
    const [editIsActive, setEditIsActive] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);

    const designationOptions = useMemo(
        () => designations.map((d) => ({ value: d.name, label: d.full_name || d.name })),
        [designations],
    );

    const loadUsers = async () => {
        const data = await listAdminUsers(token);
        setUsers(data || []);
    };

    const loadDesignations = async () => {
        const data = await listDesignations(token);
        setDesignations(data || []);
    };

    const loadPolicies = async () => {
        const data = await listAdminPolicies(token);
        setPolicies(data || []);
    };

    const loadLogs = async () => {
        const data = await listAdminAuditLogs(token, { limit: 200 });
        setLogs(data || []);
    };

    const loadAll = async () => {
        try {
            await Promise.all([loadUsers(), loadDesignations(), loadPolicies(), loadLogs()]);
        } catch (err) {
            notifications.show({
                title: "Admin console unavailable",
                message: getApiErrorMessage(err, "Failed to load admin data."),
                color: "red",
            });
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const handleCreateUser = async () => {
        if (!createForm.username || !createForm.password) {
            notifications.show({
                title: "Missing required fields",
                message: "Username and password are required.",
                color: "red",
            });
            return;
        }

        try {
            await createAdminUser(createForm, token);
            notifications.show({
                title: "User created",
                message: `User ${createForm.username} created successfully.`,
                color: "green",
            });
            setCreateForm(DEFAULT_CREATE_FORM);
            loadUsers();
            loadLogs();
        } catch (err) {
            notifications.show({
                title: "Create failed",
                message: getApiErrorMessage(err, "Could not create user."),
                color: "red",
            });
        }
    };

    const openEditUser = (user) => {
        setSelectedUser(user);
        setEditRoles(user.roles || []);
        setEditIsStaff(Boolean(user.is_staff));
        setEditIsActive(Boolean(user.is_active));
        setShowUserModal(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        try {
            await updateAdminUser(
                selectedUser.id,
                {
                    designation_names: editRoles,
                    is_staff: editIsStaff,
                    is_active: editIsActive,
                },
                token,
            );

            notifications.show({
                title: "User updated",
                message: `Updated roles for ${selectedUser.username}.`,
                color: "green",
            });
            setShowUserModal(false);
            loadUsers();
            loadLogs();
        } catch (err) {
            notifications.show({
                title: "Update failed",
                message: getApiErrorMessage(err, "Could not update user."),
                color: "red",
            });
        }
    };

    const handleDeactivateUser = async (user) => {
        try {
            await deactivateAdminUser(user.id, token);
            notifications.show({
                title: "User deactivated",
                message: `${user.username} has been deactivated.`,
                color: "green",
            });
            loadUsers();
            loadLogs();
        } catch (err) {
            notifications.show({
                title: "Deactivate failed",
                message: getApiErrorMessage(err, "Could not deactivate user."),
                color: "red",
            });
        }
    };

    const handleSavePolicy = async () => {
        if (!newPolicyKey) {
            notifications.show({
                title: "Policy key required",
                message: "Enter a policy key.",
                color: "red",
            });
            return;
        }

        let parsedValue = {};
        try {
            parsedValue = JSON.parse(newPolicyValue || "{}");
        } catch (err) {
            notifications.show({
                title: "Invalid JSON",
                message: "Policy value must be valid JSON.",
                color: "red",
            });
            return;
        }

        try {
            await updateAdminPolicies(
                {
                    key: newPolicyKey,
                    value: parsedValue,
                },
                token,
            );
            notifications.show({
                title: "Policy updated",
                message: `${newPolicyKey} saved successfully.`,
                color: "green",
            });
            setNewPolicyKey("");
            setNewPolicyValue("{}");
            loadPolicies();
            loadLogs();
        } catch (err) {
            notifications.show({
                title: "Policy update failed",
                message: getApiErrorMessage(err, "Could not update policy."),
                color: "red",
            });
        }
    };

    return (
        <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{
                backgroundColor: "#F5F7F8",
                height: "70vh",
                width: "90vw",
                overflowY: "auto",
            }}
        >
            <Group justify="space-between" mb="md">
                <Title order={3}>FT Admin User and Role Management</Title>
                <Button variant="outline" onClick={loadAll}>Refresh</Button>
            </Group>

            <Tabs defaultValue="users">
                <Tabs.List>
                    <Tabs.Tab value="users">Users and Roles</Tabs.Tab>
                    <Tabs.Tab value="policies">Policies</Tabs.Tab>
                    <Tabs.Tab value="audit">Audit Logs</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="users" pt="md">
                    <Stack gap="md">
                        <Box>
                            <Text fw={600} mb="xs">Create User</Text>
                            <Group grow>
                                <TextInput
                                    label="Username"
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, username: e.currentTarget.value }))}
                                />
                                <TextInput
                                    label="Password"
                                    type="password"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, password: e.currentTarget.value }))}
                                />
                                <TextInput
                                    label="First Name"
                                    value={createForm.first_name}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, first_name: e.currentTarget.value }))}
                                />
                                <TextInput
                                    label="Last Name"
                                    value={createForm.last_name}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, last_name: e.currentTarget.value }))}
                                />
                            </Group>
                            <Group grow mt="sm">
                                <TextInput
                                    label="Email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, email: e.currentTarget.value }))}
                                />
                                <Select
                                    label="Role Designations"
                                    data={designationOptions}
                                    value={null}
                                    onChange={(value) => {
                                        if (!value) return;
                                        setCreateForm((s) => ({
                                            ...s,
                                            designation_names: Array.from(new Set([...(s.designation_names || []), value])),
                                        }));
                                    }}
                                    searchable
                                />
                            </Group>
                            <Text size="sm" c="dimmed" mt="xs">
                                Selected Roles: {(createForm.designation_names || []).join(", ") || "None"}
                            </Text>
                            <Group mt="sm">
                                <Button onClick={handleCreateUser}>Create User</Button>
                            </Group>
                        </Box>

                        <Divider />

                        <Box>
                            <Text fw={600} mb="xs">Existing Users</Text>
                            <Table withTableBorder withColumnBorders>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Name</th>
                                        <th>Roles</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.username}</td>
                                            <td>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "-"}</td>
                                            <td>{(user.roles || []).join(", ") || "-"}</td>
                                            <td>{user.is_active ? "Active" : "Inactive"}</td>
                                            <td>
                                                <Group gap="xs">
                                                    <Button size="xs" variant="light" onClick={() => openEditUser(user)}>
                                                        Edit Roles
                                                    </Button>
                                                    {user.is_active && (
                                                        <Button size="xs" color="red" variant="light" onClick={() => handleDeactivateUser(user)}>
                                                            Deactivate
                                                        </Button>
                                                    )}
                                                </Group>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Box>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="policies" pt="md">
                    <Stack gap="md">
                        <Box>
                            <Text fw={600} mb="xs">Update FT Policy</Text>
                            <TextInput
                                label="Policy Key"
                                placeholder="example: allowed_designations"
                                value={newPolicyKey}
                                onChange={(e) => setNewPolicyKey(e.currentTarget.value)}
                            />
                            <Textarea
                                label="Policy JSON Value"
                                minRows={6}
                                mt="sm"
                                value={newPolicyValue}
                                onChange={(e) => setNewPolicyValue(e.currentTarget.value)}
                            />
                            <Group mt="sm">
                                <Button onClick={handleSavePolicy}>Save Policy</Button>
                            </Group>
                        </Box>

                        <Divider />

                        <Box>
                            <Text fw={600} mb="xs">Current Policies</Text>
                            <Table withTableBorder withColumnBorders>
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>Value</th>
                                        <th>Updated By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policies.map((policy) => (
                                        <tr key={policy.key}>
                                            <td>{policy.key}</td>
                                            <td><Text size="sm">{JSON.stringify(policy.value)}</Text></td>
                                            <td>{policy.updated_by || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Box>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="audit" pt="md">
                    <Table withTableBorder withColumnBorders>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Actor</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((row) => (
                                <tr key={row.id}>
                                    <td>{new Date(row.created_at).toLocaleString()}</td>
                                    <td>{row.actor || "system"}</td>
                                    <td>{row.action}</td>
                                    <td>{row.target_user || row.target_identifier || "-"}</td>
                                    <td><Text size="sm">{JSON.stringify(row.details || {})}</Text></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Tabs.Panel>
            </Tabs>

            <Modal opened={showUserModal} onClose={() => setShowUserModal(false)} title="Edit User Roles" centered>
                <Stack>
                    <Text fw={600}>{selectedUser?.username}</Text>
                    <Select
                        label="Add Role Designation"
                        data={designationOptions}
                        value={null}
                        onChange={(value) => {
                            if (!value) return;
                            setEditRoles((prev) => Array.from(new Set([...(prev || []), value])));
                        }}
                        searchable
                    />
                    <Text size="sm">Current roles: {editRoles.join(", ") || "None"}</Text>
                    <Button
                        variant="outline"
                        onClick={() => setEditRoles([])}
                    >
                        Clear Roles
                    </Button>
                    <Switch label="is_staff" checked={editIsStaff} onChange={(e) => setEditIsStaff(e.currentTarget.checked)} />
                    <Switch label="is_active" checked={editIsActive} onChange={(e) => setEditIsActive(e.currentTarget.checked)} />
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
                        <Button onClick={handleUpdateUser}>Save Changes</Button>
                    </Group>
                </Stack>
            </Modal>
        </Card>
    );
}
