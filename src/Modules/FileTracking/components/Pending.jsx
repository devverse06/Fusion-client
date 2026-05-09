import { useState, useEffect } from "react";
import {
    Box,
    Card,
    Title,
    Table,
    ActionIcon,
    Tooltip,
    Group,
    Text,
    Button,
    Pagination,
    Stack,
    Badge,
    Divider,
    useMantineTheme,
    Center,
    TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
    Eye,
    CaretUp,
    CaretDown,
    ArrowsDownUp,
    MagnifyingGlass,
    ArrowClockwise,
    Folder,
} from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import axios from "axios";
import { notifications } from "@mantine/notifications";
import View from "./ViewFile";
import { newPendingRoute } from "../../../routes/filetrackingRoutes";
import { getApiErrorMessage } from "../utils/apiErrors";

export default function Pending() {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem("authToken");
    const role = useSelector((state) => state.user.role);
    const username = useSelector((state) => state.user.roll_no);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("");
    const itemsPerPage = 7;
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    // Helper function to convert dates
    const convertDate = (date) => {
        const d = new Date(date);
        return d.toLocaleString();
    };

    // Helper function to generate file ID
    const generateFileId = (file) => {
        if (file?.file_number) return file.file_number;
        if (!file || !file.upload_date || !file.id) return "Loading...";
        return `${file.branch || "FTS"}-${new Date(file.upload_date).getFullYear()}-${(
            new Date(file.upload_date).getMonth() + 1
        )
            .toString()
            .padStart(2, "0")}-#${file.id}`;
    };

    // Fetch pending files on component mount
    useEffect(() => {
        const getPendingFiles = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${newPendingRoute}`, {
                    withCredentials: true,
                    headers: {
                        Authorization: `Token ${token}`,
                    },
                });
                setFiles(response.data);
            } catch (err) {
                console.error("Error fetching pending files:", err);
                notifications.show({
                    title: "Could not load Pending files",
                    message: getApiErrorMessage(err, "Please refresh and try again."),
                    color: "red",
                });
            } finally {
                setLoading(false);
            }
        };

        getPendingFiles();
    }, [token]);

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
        setCurrentPage(1);
    };

    const sortedFiles = [...files].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const direction = sortConfig.direction === "asc" ? 1 : -1;
        return a[sortConfig.key] > b[sortConfig.key] ? direction : -direction;
    });

    const filteredFiles = sortedFiles.filter((file) => {
        const idString = generateFileId(file).toLowerCase();
        const createdBy = (file.created_by || "").toLowerCase();
        const subjectValue = (file.subject || "").toLowerCase();
        const priorityValue = (file.priority || "").toLowerCase();

        return (
            idString.includes(searchQuery.toLowerCase()) ||
            createdBy.includes(searchQuery.toLowerCase()) ||
            subjectValue.includes(searchQuery.toLowerCase()) ||
            priorityValue.includes(searchQuery.toLowerCase())
        );
    });

    const handlePageJump = (e) => {
        if (e.key === "Enter") {
            const pageNumber = parseInt(pageInput, 10);
            const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
            if (
                Number.isNaN(pageNumber) ||
                pageNumber < 1 ||
                pageNumber > totalPages
            ) {
                setPageInput("");
                return;
            }
            setCurrentPage(pageNumber);
            setPageInput("");
        }
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredFiles.length);

    const handleViewFile = (file) => {
        setSelectedFile(file);
    };

    const handleBack = () => {
        setSelectedFile(null);
    };

    if (selectedFile) {
        return (
            <View
                fileID={selectedFile.id}
                onBack={handleBack}
                contextSource="pending"
                updateFiles={() => { }}
            />
        );
    }

    // Mobile card view rendering
    const renderMobileView = () => {
        if (loading) {
            return (
                <Center style={{ height: "200px" }}>
                    <Text>Loading pending files...</Text>
                </Center>
            );
        }

        if (filteredFiles.length === 0) {
            return (
                <Center style={{ height: "200px" }}>
                    <Stack align="center" spacing="xs">
                        <Folder size={48} color={theme.colors.gray[5]} />
                        <Text c="dimmed" size="lg">
                            No pending files
                        </Text>
                        {searchQuery && (
                            <Button
                                variant="subtle"
                                leftIcon={<ArrowClockwise size={16} />}
                                onClick={() => setSearchQuery("")}
                            >
                                Clear search
                            </Button>
                        )}
                    </Stack>
                </Center>
            );
        }

        return (
            <Stack spacing="md">
                {filteredFiles
                    .slice(startIndex, endIndex)
                    .map((file, index) => (
                        <Card
                            key={index}
                            shadow="sm"
                            p="md"
                            radius="md"
                            withBorder
                            style={{ position: "relative" }}
                        >
                            <Badge
                                color="yellow"
                                variant="light"
                                size="sm"
                                style={{ position: "absolute", top: 10, right: 10 }}
                            >
                                {file.priority}
                            </Badge>

                            <Text weight={600} size="md" mb={6}>
                                {file.subject}
                            </Text>

                            <Text size="sm" color="dimmed" mb={6}>
                                {generateFileId(file)}
                            </Text>

                            <Text size="sm" mb={6}>
                                <Text span weight={500}>
                                    From:
                                </Text>{" "}
                                {file.created_by}
                            </Text>

                            <Text size="sm" mb="md">
                                <Text span weight={500}>
                                    Received:
                                </Text>{" "}
                                {convertDate(file.received_at)}
                            </Text>

                            <Button
                                size="xs"
                                variant="default"
                                onClick={() => handleViewFile(file)}
                            >
                                View & Action
                            </Button>
                        </Card>
                    ))}
            </Stack>
        );
    };

    // Desktop table view rendering
    return (
        <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{
                backgroundColor: "#FFFFFF",
                minHeight: "10vh",
                padding: isMobile ? "1rem" : "2rem",
            }}
        >
            {isMobile ? (
                renderMobileView()
            ) : (
                <div>
                    <Group position="apart" mb="md">
                        <Title order={3}>Pending Files for Action</Title>
                    </Group>

                    <Group position="apart" mb="md">
                        <TextInput
                            placeholder="Search by ID, subject, or creator..."
                            icon={<MagnifyingGlass size={18} />}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.currentTarget.value);
                                setCurrentPage(1);
                            }}
                            style={{ flex: 1 }}
                        />
                    </Group>

                    {loading ? (
                        <Center style={{ height: "200px" }}>
                            <Text>Loading pending files...</Text>
                        </Center>
                    ) : filteredFiles.length === 0 ? (
                        <Center style={{ height: "200px" }}>
                            <Stack align="center" spacing="xs">
                                <Folder size={48} color={theme.colors.gray[5]} />
                                <Text c="dimmed" size="lg">
                                    No pending files
                                </Text>
                                {searchQuery && (
                                    <Button
                                        variant="subtle"
                                        leftIcon={<ArrowClockwise size={16} />}
                                        onClick={() => setSearchQuery("")}
                                    >
                                        Clear search
                                    </Button>
                                )}
                            </Stack>
                        </Center>
                    ) : (
                        <>
                            <Table striped>
                                <thead>
                                    <tr>
                                        <th
                                            onClick={() => handleSort("file_id")}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <Group spacing="xs">
                                                <Text size="sm" weight={500}>
                                                    File ID
                                                </Text>
                                                <ArrowsDownUp size={14} />
                                            </Group>
                                        </th>
                                        <th
                                            onClick={() => handleSort("subject")}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <Group spacing="xs">
                                                <Text size="sm" weight={500}>
                                                    Subject
                                                </Text>
                                                <ArrowsDownUp size={14} />
                                            </Group>
                                        </th>
                                        <th
                                            onClick={() => handleSort("created_by")}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <Group spacing="xs">
                                                <Text size="sm" weight={500}>
                                                    From
                                                </Text>
                                                <ArrowsDownUp size={14} />
                                            </Group>
                                        </th>
                                        <th
                                            onClick={() => handleSort("priority")}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <Group spacing="xs">
                                                <Text size="sm" weight={500}>
                                                    Priority
                                                </Text>
                                                <ArrowsDownUp size={14} />
                                            </Group>
                                        </th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFiles
                                        .slice(startIndex, endIndex)
                                        .map((file, index) => (
                                            <tr key={index}>
                                                <td>{generateFileId(file)}</td>
                                                <td>{file.subject}</td>
                                                <td>{file.created_by}</td>
                                                <td>
                                                    <Badge
                                                        color={
                                                            file.priority === "URGENT"
                                                                ? "red"
                                                                : file.priority === "HIGH"
                                                                    ? "orange"
                                                                    : "gray"
                                                        }
                                                        variant="light"
                                                    >
                                                        {file.priority}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Tooltip label="View and take action">
                                                        <ActionIcon
                                                            color="blue"
                                                            onClick={() => handleViewFile(file)}
                                                        >
                                                            <Eye size={18} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </Table>

                            <Group position="apart" mt="md">
                                <Text size="sm">
                                    Showing {startIndex + 1} to {endIndex} of {filteredFiles.length}
                                </Text>
                                <Group spacing="xs">
                                    <TextInput
                                        placeholder="Go to page"
                                        type="number"
                                        value={pageInput}
                                        onChange={(e) => setPageInput(e.currentTarget.value)}
                                        onKeyPress={handlePageJump}
                                        style={{ width: "80px" }}
                                    />
                                    <Pagination
                                        page={currentPage}
                                        onChange={setCurrentPage}
                                        total={Math.ceil(filteredFiles.length / itemsPerPage)}
                                    />
                                </Group>
                            </Group>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
