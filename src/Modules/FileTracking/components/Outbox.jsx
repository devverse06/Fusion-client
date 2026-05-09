import { useState, useEffect } from "react";
import {
  Box,
  Card,
  Title,
  Table,
  ActionIcon,
  Tooltip,
  Group,
  TextInput,
  Pagination,
  Text,
  Badge,
  Divider,
  Button,
  Stack,
  ScrollArea,
  useMantineTheme,
  Center,
  Chip,
} from "@mantine/core";
import {
  Eye,
  Archive,
  CaretUp,
  CaretDown,
  ArrowsDownUp,
  MagnifyingGlass,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mantine/hooks";
import axios from "axios";
import { notifications } from "@mantine/notifications";
import { ArrowClockwise, Folder } from "@phosphor-icons/react";
import View from "./ViewFile";
import SendFile from "./SendFile";
import { newArchiveRoute } from "../../../routes/filetrackingRoutes";
import { listOutbox, listPending } from "../api";
import { getApiErrorMessage } from "../utils/apiErrors";

const STATUS_COLORS = {
  PENDING: "yellow",
  "IN PROGRESS": "blue",
  ACCEPTED: "green",
  REJECTED: "red",
  CREATED: "gray",
  SENT: "cyan",
  FORWARDED: "blue",
  APPROVED: "green",
  RETURNED: "orange",
  CLOSED: "violet",
  ARCHIVED: "gray",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "IN PROGRESS", label: "In Progress" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

export default function Outboxfunc() {
  const [files, setFiles] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("authToken");
  const role = useSelector((state) => state.user.role);
  const username = useSelector((state) => state.user.roll_no);
  const accountUsername = useSelector((state) => state.user.username);
  const loginUsername = useSelector((state) => state.user.loginUsername);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const itemsPerPage = 7;
  let current_module = useSelector((state) => state.module.current_module);
  current_module = current_module.split(" ").join("").toLowerCase();
  const theme = useMantineTheme();

  // Media query for responsive design
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const convertDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const [selectedFile, setSelectedFile] = useState(null);

  const fetchAllFiles = async () => {
    try {
      const [outboxData, pendingData] = await Promise.all([
        listOutbox(token),
        listPending(token),
      ]);

      // Combine outbox and pending files
      const combinedFiles = [
        ...(Array.isArray(outboxData) ? outboxData : []),
        ...(Array.isArray(pendingData) ? pendingData : []),
      ];

      // Remove duplicates by ID
      const uniqueFiles = Array.from(
        new Map(combinedFiles.map((file) => [file.id, file])).values()
      );

      setFiles(uniqueFiles);
      console.log("Combined Outbox + Pending files:", uniqueFiles);
    } catch (err) {
      console.error("Error fetching files:", err);
      notifications.show({
        title: "Could not load Outbox",
        message: getApiErrorMessage(err, "Please refresh and try again."),
        color: "red",
        position: "top-center",
      });
    }
  };

  useEffect(() => {
    fetchAllFiles();
  }, [role, token, username, current_module]);

  const handleBack = () => {
    setSelectedFile(null);
  };

  const normalizeIdentifier = (value) => {
    if (!value) return "";
    return String(value).split("[")[0].trim().toLowerCase();
  };

  const userIdentitySet = new Set(
    [
      normalizeIdentifier(username),
      normalizeIdentifier(accountUsername),
      normalizeIdentifier(loginUsername),
    ].filter(Boolean),
  );

  const isCurrentUser = (value) => userIdentitySet.has(normalizeIdentifier(value));

  const canArchiveFile = (file) => {
    if (typeof file?.can_archive === "boolean") {
      const isCreatorByIdentity = isCurrentUser(file?.created_by || file?.uploader);
      return (file.can_archive || isCreatorByIdentity) && file?.status === "CLOSED";
    }

    return isCurrentUser(file?.created_by || file?.uploader) && file?.status === "CLOSED";
  };

  const canSendFile = (file) => {
    if (!file) return false;

    if (typeof file?.can_send === "boolean") {
      return file.can_send;
    }

    const isCreator = isCurrentUser(file?.created_by || file?.uploader);
    const isCreatedStatus = file?.status === "CREATED";

    return isCreator && isCreatedStatus;
  };

  const getSendRestrictionLabel = (file) => {
    if (!file) return "File details unavailable";
    if (file?.status !== "CREATED") {
      return `File status is ${file?.status || "UNKNOWN"}. Only CREATED files can be sent`;
    }
    if (!canSendFile(file)) {
      return "Only creator can send CREATED files";
    }
    return "Send File to Receiver";
  };

  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);
    return STATUS_COLORS[normalized] || STATUS_COLORS.IN_PROGRESS || "gray";
  };

  const normalizeStatus = (status) => {
    if (!status) return "PENDING";
    const normalized = String(status).toUpperCase().trim();
    // Map common status variations to our filter options
    if (normalized.includes("PENDING")) return "PENDING";
    if (normalized.includes("FORWARD")) return "IN PROGRESS";
    if (normalized.includes("PROGRESS")) return "IN PROGRESS";
    if (normalized.includes("ACCEPT")) return "ACCEPTED";
    if (normalized.includes("REJECT")) return "REJECTED";
    return normalized;
  };

  const handleArchive = async (fileID) => {
    try {
      await axios.post(
        newArchiveRoute(fileID),
        { remarks: "Archived from outbox" },
        {
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileID));
    } catch (err) {
      console.error("Error archiving file:", err);
      notifications.show({
        title: "Archive failed",
        message: getApiErrorMessage(err, "Could not archive file."),
        color: "red",
        position: "top-center",
      });
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return a[sortConfig.key] > b[sortConfig.key] ? direction : -direction;
  });

  // Apply status filter
  const statusFilteredFiles = sortedFiles.filter((file) => {
    if (statusFilter === "all") return true;
    const fileStatus = normalizeStatus(file.status);
    return fileStatus === statusFilter;
  });

  // Apply search filter
  const filteredFiles = statusFilteredFiles.filter((file) => {
    const idString = (file.file_number || "").toLowerCase();
    const subjectValue = (file.subject || "").toLowerCase();
    const createdBy = (file.created_by || file.uploader || "").toLowerCase();
    const statusValue = (file.status || "").toLowerCase();
    const dateValue = convertDate(file.created_at || file.received_at || file.upload_date).toLowerCase();

    return (
      idString.includes(searchQuery.toLowerCase()) ||
      subjectValue.includes(searchQuery.toLowerCase()) ||
      createdBy.includes(searchQuery.toLowerCase()) ||
      statusValue.includes(searchQuery.toLowerCase()) ||
      dateValue.includes(searchQuery.toLowerCase())
    );
  });

  const handlePageJump = (e) => {
    if (e.key === "Enter") {
      const pageNumber = Number.parseInt(pageInput, 10);
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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredFiles.length);

  // Helper function to generate file ID
  const generateFileId = (file) => {
    if (file?.file_number) return file.file_number;
    if (!file || !file.upload_date || !file.id) return "Loading...";
    const date = new Date(file.upload_date);
    if (Number.isNaN(date.getTime())) return `FTS-#${file.id}`;
    return `${file.branch || "FTS"}-${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-#${file.id}`;
  };

  // Mobile card view rendering
  const renderMobileView = () => {
    return (
      <Stack spacing="md">
        {filteredFiles.length === 0 && (
          <Center style={{ height: "200px" }}>
            <Stack align="center" spacing="xs">
              <Folder size={48} color={theme.colors.gray[5]} />
              <Text c="dimmed" size="lg">
                No files found in Outbox!
              </Text>
              {searchQuery && (
                <Button
                  variant="subtle"
                  leftSection={<ArrowClockwise size={16} />}
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </Stack>
          </Center>
        )}
        {filteredFiles.length > 0 &&
          filteredFiles
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((file, index) => (
              <Card
                key={index}
                shadow="sm"
                p="md"
                radius="md"
                withBorder
                style={{ position: "relative" }}
              >
                <Group position="apart" mb="xs">
                  <Badge color="blue" variant="light" size="sm">
                    {generateFileId(file)}
                  </Badge>
                  <Badge color={getStatusColor(file.status)} variant="filled" size="sm">
                    {normalizeStatus(file.status)}
                  </Badge>
                </Group>

                <Text weight={600} size="md" mb={6}>
                  {file.subject}
                </Text>

                <Group position="apart" mt="xs" mb="xs">
                  <Text size="sm">
                    <Text span weight={500}>
                      Status:
                    </Text>{" "}
                    {file.status}
                  </Text>
                </Group>

                <Divider my="xs" />

                <Group position="apart" mt="xs">
                  <Text size="sm">
                    <Text span weight={500}>
                      Created by:
                    </Text>{" "}
                    {file.uploader}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {convertDate(file.upload_date)}
                  </Text>
                </Group>

                <Group position="apart" mt="md">
                  <Tooltip label="View File" position="top" withArrow>
                    <Button
                      variant="light"
                      color="blue"
                      size="xs"
                      leftSection={<Eye size="1rem" />}
                      onClick={() => setSelectedFile(file)}
                      fullWidth
                    >
                      View
                    </Button>
                  </Tooltip>

                  <Tooltip
                    label={canArchiveFile(file) ? "Archive File" : "Only file owner can archive closed files"}
                    position="top"
                    withArrow
                  >
                    <Button
                      variant="light"
                      color="red"
                      size="xs"
                      leftSection={<Archive size="1rem" />}
                      onClick={() => canArchiveFile(file) && handleArchive(file.id)}
                      disabled={!canArchiveFile(file)}
                      fullWidth
                    >
                      Archive
                    </Button>
                  </Tooltip>
                </Group>
              </Card>
            ))}
      </Stack>
    );
  };

  // Desktop table view rendering
  const renderDesktopView = () => {
    return (
      <ScrollArea>
        {filteredFiles.length > 0 ? (
          <Table
            highlightOnHover
            style={{
              width: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              fontSize: "14px",
              minWidth: "950px",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "#fff",
                zIndex: 1,
              }}
            >
              <tr style={{ backgroundColor: "#0000" }}>
                {[
                  { key: "id", label: "File ID" },
                  { key: "status", label: "Status" },
                  { key: "subject", label: "Subject" },
                  { key: "upload_date", label: "Date" },
                  { key: "uploader", label: "Created by" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{
                      cursor: "pointer",
                      padding: "12px",
                      width: key === "status" ? "12%" : "17%",
                      border: "1px solid #0000",
                      alignItems: "center",
                      gap: "5px",
                      height: "36px",
                    }}
                  >
                    {label}
                    {sortConfig.key === key ? (
                      sortConfig.direction === "asc" ? (
                        <CaretUp size={16} />
                      ) : (
                        <CaretDown size={16} />
                      )
                    ) : (
                      <ArrowsDownUp size={16} opacity={0.6} />
                    )}
                  </th>
                ))}
                <th
                  style={{
                    padding: "6px",
                    width: "8.5%",
                    border: "1px solid #ddd",
                    height: "36px",
                  }}
                >
                  Archive
                </th>
                <th
                  style={{
                    padding: "6px",
                    width: "8.5%",
                    border: "1px solid #ddd",
                    height: "36px",
                  }}
                >
                  View File
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((file, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        padding: "13px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        height: "36px",
                      }}
                    >
                      {generateFileId(file)}
                    </td>

                    <td
                      style={{
                        padding: "6px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        height: "36px",
                      }}
                    >
                      <Badge color={getStatusColor(file.status)} variant="filled" size="sm">
                        {normalizeStatus(file.status)}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        height: "36px",
                      }}
                    >
                      {file.subject}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        height: "36px",
                      }}
                    >
                      {convertDate(file.created_at || file.received_at || file.upload_date)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        height: "36px",
                      }}
                    >
                      {file.created_by || file.uploader}[{file.uploader_designation || "-"}]
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        height: "36px",
                      }}
                    >
                      <Tooltip
                        label={canArchiveFile(file) ? "Archive File" : "Only file owner can archive closed files"}
                        position="top"
                        withArrow
                      >
                        <ActionIcon
                          variant="light"
                          color="red"
                          style={{
                            transition: "background-color 0.3s",
                            width: "2rem",
                            height: "2rem",
                          }}
                          onClick={() => canArchiveFile(file) && handleArchive(file.id)}
                          disabled={!canArchiveFile(file)}
                        >
                          <Archive size="1rem" />
                        </ActionIcon>
                      </Tooltip>
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        height: "36px",
                      }}
                    >
                      <Tooltip label="View File" position="top" withArrow>
                        <ActionIcon
                          variant="light"
                          color="black"
                          style={{
                            transition: "background-color 0.3s",
                            width: "2rem",
                            height: "2rem",
                          }}
                          onClick={() => setSelectedFile(file)}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#E3F2FD";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                          }}
                        >
                          <Eye size="1rem" />
                        </ActionIcon>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        ) : (
          <Center style={{ height: "200px" }}>
            <Stack align="center" spacing="xs">
              <Folder size={48} color={theme.colors.gray[5]} />
              <Text c="dimmed" size="lg">
                No files found in Outbox!
              </Text>
              {searchQuery && (
                <Button
                  variant="subtle"
                  leftSection={<ArrowClockwise size={16} />}
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </Stack>
          </Center>
        )}
      </ScrollArea>
    );
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        backgroundColor: "#F5F7F8",
        width: "100%",
        minHeight: "70vh",
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        overflowY: selectedFile ? "hidden" : "auto",
      }}
    >
      {!selectedFile && (
        <>
          <Group
            position="apart"
            mb="md"
            align="center"
            style={{ flexWrap: "wrap" }}
          >
            <Title
              order={2}
              style={{
                fontSize: "24px",
              }}
            >
              Outbox (Sent Files)
            </Title>
            <TextInput
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                marginBottom: isMobile ? "10px" : "0",
                width: isMobile ? "100%" : "auto",
              }}
              icon={<MagnifyingGlass size={16} />}
            />
          </Group>

          {/* Status Filter Chips */}
          <Group spacing="xs" mb="md" style={{ flexWrap: "wrap" }}>
            <Text weight={500} size="sm">
              Status:
            </Text>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                checked={statusFilter === option.value}
                onChange={() => {
                  setStatusFilter(option.value);
                  setCurrentPage(1);
                }}
                color={option.value === "all" ? "blue" : getStatusColor(option.value)}
                variant="filled"
                size="sm"
              >
                {option.label}
              </Chip>
            ))}
          </Group>
        </>
      )}

      {selectedFile ? (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Title
            order={3}
            mb="md"
            style={{
              fontSize: isMobile ? "22px" : "26px",
              textAlign: "center",
              width: "100%",
            }}
          >
            {selectedFile.subject}
          </Title>
          <View
            onBack={handleBack}
            fileID={selectedFile.id}
            updateFiles={fetchAllFiles}
          />
        </div>
      ) : (
        <Box
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            overflowY: "auto",
            height: "100%",
            minHeight: "300px",
            backgroundColor: "#fff",
            display: "flex",
            flexDirection: "column",
            marginBottom: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "-1px",
              padding: isMobile ? "10px" : "0",
            }}
          >
            {isMobile ? renderMobileView() : renderDesktopView()}
          </div>
          <Group
            position="right"
            style={{
              backgroundColor: "#fff",
              padding: "8px 16px",
              borderTop: "1px solid #ddd",
              marginTop: "auto",
              minHeight: "60px",
              display: "flex",
              alignItems: "center",
              height: "35px",
              gap: "16px",
              flexWrap: "wrap",
              justifyContent: isMobile ? "center" : "flex-end",
            }}
          >
            <Text size="sm" color="dimmed">
              {`Showing ${filteredFiles.length > 0 ? startIndex + 1 : 0}-${endIndex} of ${filteredFiles.length} files`}
            </Text>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                height: "36px",
                marginLeft: isMobile ? "0" : "auto",
                flexWrap: isMobile ? "wrap" : "nowrap",
                justifyContent: isMobile ? "center" : "flex-start",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <Tooltip
                label={`Enter page number (1-${Math.ceil(filteredFiles.length / itemsPerPage)})`}
                position="top"
              >
                <TextInput
                  placeholder="Page #"
                  value={pageInput}
                  onChange={(e) => {
                    setPageInput(e.target.value.replace(/[^0-9]/g, ""));
                  }}
                  onKeyDown={handlePageJump}
                  style={{
                    width: "80px",
                    textAlign: "center",
                  }}
                  size="sm"
                  type="text"
                  maxLength={3}
                />
              </Tooltip>
              <Pagination
                total={Math.ceil(filteredFiles.length / itemsPerPage) || 1}
                value={currentPage}
                size="sm"
                onChange={setCurrentPage}
                boundaries={isMobile ? 0 : 1}
                siblings={isMobile ? 0 : 1}
                withEdges={!isMobile}
              />
            </div>
          </Group>
        </Box>
      )}
    </Card>
  );
}
