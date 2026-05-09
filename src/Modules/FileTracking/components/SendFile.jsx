/* eslint-disable react/prop-types */
/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from "react";
import {
    Modal,
    TextInput,
    Select,
    Button,
    Textarea,
    Group,
    Stack,
    Text,
    Box,
    Badge,
    Autocomplete,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import axios from "axios";
import {
    newSendRoute,
    designationsRoute,
    getUsernameRoute,
} from "../../../routes/filetrackingRoutes";

/**
 * ✅ SendFile Component
 * 
 * Separate dialog for sending files to receivers.
 * User must:
 * 1. Select receiver designation
 * 2. Search and select receiver username
 * 3. Add sending remarks (minimum 5 characters)
 * 
 * This separates Send action from Draft/Create action
 */
export default function SendFile({ file, onClose, onSuccess }) {
    const [designations, setDesignations] = useState([]);
    const [usernameSuggestions, setUsernameSuggestions] = useState([]);
    const [selectedDesignation, setSelectedDesignation] = useState("");
    const [selectedUsername, setSelectedUsername] = useState("");
    const [requiredDesignations, setRequiredDesignations] = useState([]);
    const [remarks, setRemarks] = useState("");
    const [isSending, setIsSending] = useState(false);

    const token = localStorage.getItem("authToken");

    // Fetch available designations for selected receiver username.
    useEffect(() => {
        const fetchDesignations = async () => {
            try {
                const response = await axios.get(
                    `${designationsRoute}${selectedUsername}`,
                    {
                        params: {
                            file_id: file?.id,
                        },
                        headers: { Authorization: `Token ${token}` },
                    }
                );
                const required = Array.isArray(response.data.required_designations)
                    ? response.data.required_designations.filter(Boolean)
                    : (response.data.required_designation ? [response.data.required_designation] : []);
                setRequiredDesignations(required);
                const names = [...new Set((response.data.designations || []).filter(Boolean))];
                setDesignations(names.map((name) => ({ value: name, label: name })));
                const normalizedRequiredSet = new Set(required.map((name) => name.trim().toLowerCase()));
                const requiredMatch = names.find(
                    (name) => normalizedRequiredSet.has(name.trim().toLowerCase())
                );

                if (requiredMatch) {
                    setSelectedDesignation(requiredMatch);
                } else if (names.length === 1) {
                    setSelectedDesignation(names[0]);
                }
            } catch (error) {
                console.error("Error fetching designations:", error);
                notifications.show({
                    title: "Receiver lookup failed",
                    message: "Could not load receiver designations.",
                    color: "red",
                    position: "top-center",
                });
            }
        };

        if (file && token && selectedUsername.trim().length >= 2) {
            fetchDesignations();
            return;
        }

        setDesignations([]);
        setSelectedDesignation("");
        setRequiredDesignations([]);
    }, [file, token, selectedUsername]);

    // Fetch receiver username suggestions as user types.
    useEffect(() => {
        const fetchUserSuggestions = async () => {
            if (!selectedUsername || selectedUsername.length < 2) {
                setUsernameSuggestions([]);
                return;
            }

            try {
                const response = await axios.post(
                    getUsernameRoute,
                    {
                        value: selectedUsername,
                        file_id: file?.id,
                    },
                    { headers: { Authorization: `Token ${token}` } }
                );
                const users = JSON.parse(response.data.users || '[]');
                if (Array.isArray(users)) {
                    setUsernameSuggestions(users.map((user) => user.fields.username));
                }
            } catch (error) {
                console.error("Error fetching username suggestions:", error);
            }
        };

        fetchUserSuggestions();
    }, [selectedUsername, token, file]);

    const showIneligibleHint = (
        selectedUsername.trim().length >= 2
        && requiredDesignations.length > 0
        && designations.length === 0
    );

    const requiredDesignationLabel = requiredDesignations.join(", ");

    // ✅ Validate and send file
    const handleSend = async () => {
        if (!selectedUsername.trim()) {
            notifications.show({
                title: "Receiver required",
                message: "Please enter/select a receiver username.",
                color: "orange",
                position: "top-center",
            });
            return;
        }

        if (!selectedDesignation.trim()) {
            notifications.show({
                title: "Designation required",
                message: "Please select the receiver designation.",
                color: "orange",
                position: "top-center",
            });
            return;
        }

        if (!remarks.trim() || remarks.trim().length < 5) {
            notifications.show({
                title: "Remarks required",
                message: "Please add remarks (minimum 5 characters).",
                color: "orange",
                position: "top-center",
            });
            return;
        }

        setIsSending(true);

        try {
            // ✅ Call Send API endpoint
            const response = await axios.post(
                newSendRoute(file.id),
                {
                    receiver: selectedUsername.trim(),
                    receiver_designation: selectedDesignation.trim(),
                    remarks: remarks.trim(),
                },
                {
                    headers: {
                        Authorization: `Token ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 200) {
                notifications.show({
                    title: "File sent successfully",
                    message: `File sent to ${selectedUsername.trim()} (${selectedDesignation.trim()}).`,
                    color: "green",
                    position: "top-center",
                });

                // Reset form and close modal
                setSelectedUsername("");
                setSelectedDesignation("");
                setRemarks("");
                onClose();

                // Trigger parent refresh
                if (onSuccess) {
                    onSuccess();
                }
            }
        } catch (error) {
            const errorMsg =
                error?.response?.data?.error || "Could not send file. Please try again.";
            notifications.show({
                title: "Send failed",
                message: errorMsg,
                color: "red",
                position: "top-center",
            });
            console.error("Error sending file:", error);
        } finally {
            setIsSending(false);
        }
    };

    if (!file) return null;

    return (
        <Modal
            opened={!!file}
            onClose={onClose}
            title="Send File"
            size="lg"
            centered
        >
            <Stack spacing="lg">
                {/* File Info - Read Only */}
                <Box
                    style={{
                        backgroundColor: "#f5f5f5",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                    }}
                >
                    <Text size="sm" weight={600} mb="xs">
                        📄 File Details
                    </Text>
                    <Group spacing="lg" grow>
                        <Box>
                            <Text size="sm" color="dimmed">
                                File Number
                            </Text>
                            <Text weight={600}>{file.file_number || "N/A"}</Text>
                        </Box>
                        <Box>
                            <Text size="sm" color="dimmed">
                                Subject
                            </Text>
                            <Text weight={600} truncate title={file.subject}>
                                {file.subject}
                            </Text>
                        </Box>
                        <Box>
                            <Text size="sm" color="dimmed">
                                Status
                            </Text>
                            <Badge size="sm" variant="light">
                                {file.status}
                            </Badge>
                        </Box>
                    </Group>
                </Box>

                <Autocomplete
                    label="Receiver Username *"
                    placeholder="Type and choose receiver username"
                    value={selectedUsername}
                    onChange={(value) => {
                        setSelectedDesignation("");
                        setSelectedUsername(value);
                    }}
                    data={usernameSuggestions}
                    required
                />

                {showIneligibleHint ? (
                    <Text size="xs" c="orange">
                        {selectedUsername.trim()} is not eligible for this step. Choose a user with designation {requiredDesignationLabel}.
                    </Text>
                ) : null}

                <Select
                    key={selectedUsername}
                    label="Receiver Designation *"
                    placeholder={selectedUsername ? "Select recipient designation" : "Type receiver username first"}
                    data={designations}
                    value={selectedDesignation}
                    onChange={(value) => setSelectedDesignation(value || "")}
                    searchable
                    required
                    disabled={!selectedUsername.trim() || selectedUsername.trim().length < 2}
                    nothingFoundMessage="No designations found"
                />

                {requiredDesignations.length > 0 ? (
                    <Text size="xs" c="dimmed">
                        Required designation(s) for this routing step: {requiredDesignationLabel}
                    </Text>
                ) : null}

                {/* Remarks - Mandatory */}
                <Textarea
                    label="Sending Remarks *"
                    placeholder="Add your remarks or comments (minimum 5 characters)"
                    value={remarks}
                    onChange={(e) => setRemarks(e.currentTarget.value)}
                    minRows={3}
                    required
                    error={
                        remarks && remarks.trim().length < 5 && remarks.length > 0
                            ? "Minimum 5 characters required"
                            : null
                    }
                />

                {/* Action Buttons */}
                <Group position="right" spacing="sm">
                    <Button variant="light" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        loading={isSending}
                        disabled={!selectedDesignation || !selectedUsername || remarks.trim().length < 5}
                    >
                        Send File
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
