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
  Paper,
  Skeleton,
  Modal,
  Center,
  LoadingOverlay,
} from "@mantine/core";
import {
  ArrowArcLeft,
  Eye,
  CaretUp,
  CaretDown,
  ArrowsDownUp,
  MagnifyingGlass,
  ArrowClockwise,
  FileText,
  Folder,
} from "@phosphor-icons/react";
import axios from "axios";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import View from "./ViewFile";
import {
  newArchiveListRoute,
  newUnarchiveRoute,
} from "../../../routes/filetrackingRoutes";

export default function ArchiveFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [unarchiveLoading, setUnarchiveLoading] = useState(false);
  const [confirmUnarchiveModal, setConfirmUnarchiveModal] = useState(false);
  const [selectedUnarchiveFile, setSelectedUnarchiveFile] = useState(null);
  const itemsPerPage = 7;
  const token = localStorage.getItem("authToken");
  const role = useSelector((state) => state.user.role);
  const username = useSelector((state) => state.user.roll_no);
  let current_module = useSelector((state) => state.module.current_module);
  current_module = current_module.split(" ").join("").toLowerCase();
  const theme = useMantineTheme();

  // Media query for responsive design
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const convertDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  useEffect(() => {
    const getFiles = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${newArchiveListRoute}`, {
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        setFiles(response.data);
      } catch (err) {
        console.error("Error fetching files:", err);
        notifications.show({
          title: "Error",
          message: "Failed to load archived files. Please try again.",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    // Call the getFiles function to fetch data on component mount
    getFiles();
  }, [role, username, token, current_module]);

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

  // Helper function to generate file ID
  const generateFileId = (file) => {
    if (file?.file_number) return file.file_number;
    const dt = new Date(file.upload_date || file.created_at);
    if (Number.isNaN(dt.getTime())) return `FTS-#${file?.id || ""}`;
    return `${file.branch || "FTS"}-${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-#${file.id}`;
  };

  const filteredFiles = sortedFiles.filter((file) => {
    const idString = generateFileId(file);
    return (
      idString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.uploader || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      convertDate(file.upload_date || file.created_at)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredFiles.length);

  const [selectedFile, setSelectedFile] = useState(null);

  const openUnarchiveModal = (file) => {
    setSelectedUnarchiveFile(file);
    setConfirmUnarchiveModal(true);
  };

  const handleToggleArchive = async (fileID) => {
    setUnarchiveLoading(true);
    try {
      await axios.post(newUnarchiveRoute(fileID), {
        remarks: "Unarchived from archive section",
      }, {
        withCredentials: true,
        headers: {
          Authorization: `Token ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
      });
      const updatedFiles = files.filter((file) => file.id !== fileID);
      setFiles(updatedFiles);

      notifications.show({
        title: "Success",
        message: "File has been unarchived successfully",
        color: "green",
      });
    } catch (err) {
      console.error("Error unarchiving file:", err);
      notifications.show({
        title: "Error",
        message: "Failed to unarchive file. Please try again.",
        color: "red",
      });
    } finally {
      setUnarchiveLoading(false);
      setConfirmUnarchiveModal(false);
    }
  };

  const handleViewFile = (file) => {
    setSelectedFile(file);
  };

  const handleBack = () => {
    setSelectedFile(null);
  };

  const tableStyles = {
    padding: "8px",
    textAlign: "center",
    border: "1px solid #ddd",
    height: "32px",
  };

  // Mobile card view rendering
  const renderMobileView = () => {
    if (loading) {
      return (
        <Stack spacing="md">
          {[...Array(3)].map((_, i) => (
            <Paper key={i} shadow="xs" p="md" withBorder>
              <Skeleton height={20} width="60%" mb="sm" />
              <Skeleton height={15} mb="xs" />
              <Skeleton height={15} width="70%" mb="md" />
              <Group position="apart">
                <Skeleton height={30} width={80} />
                <Skeleton height={30} width={80} />
              </Group>
            </Paper>
          ))}
        </Stack>
      );
    }

    if (filteredFiles.length === 0) {
      return (
        <Center style={{ height: "200px" }}>
          <Stack align="center" spacing="xs">
            <Folder size={48} color={theme.colors.gray[5]} />
            <Text c="dimmed" size="lg">
              No archived files found!
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
              <Badge
                color="orange"
                variant="light"
                size="sm"
                style={{ position: "absolute", top: 10, right: 10 }}
              >
                Archived
              </Badge>

              <Text weight={600} size="md" mb={6}>
                {file.subject}
              </Text>

              <Text size="sm" color="dimmed" mb={6}>
                {generateFileId(file)}
              </Text>

              <Divider my="xs" />

              <Group position="apart" mt="xs">
                <Text size="sm">
                  <Text span weight={500}>
                    Created by:
                  </Text>{" "}
                  {file.uploader}
                </Text>
                <Text size="sm" color="dimmed">
                  {convertDate(file.upload_date || file.created_at)}
                </Text>
              </Group>

              <Group position="apart" mt="md">
                <Tooltip label="View File" position="top" withArrow>
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    leftIcon={<Eye size="1rem" />}
                    onClick={() => handleViewFile(file)}
                    fullWidth={isMobile}
                  >
                    View
                  </Button>
                </Tooltip>

                <Tooltip label="Unarchive file" position="top" withArrow>
                  <Button
                    variant="light"
                    color="green"
                    size="xs"
                    leftIcon={<ArrowArcLeft size="1rem" />}
                    onClick={() => openUnarchiveModal(file)}
                    fullWidth={isMobile}
                  >
                    Unarchive
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
    if (loading) {
      return (
        <Box p="md">
          <Skeleton height={40} mb="sm" />
          <Skeleton height={30} mb="xs" />
          <Skeleton height={30} mb="xs" />
          <Skeleton height={30} mb="xs" />
        </Box>
      );
    }

    if (filteredFiles.length === 0) {
      return (
        <Center style={{ height: "200px" }}>
          <Stack align="center" spacing="xs">
            <Folder size={48} color={theme.colors.gray[5]} />
            <Text color="dimmed" size="lg">
              No archived files found
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
      <ScrollArea>
        <Table
          highlightOnHover
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontSize: "14px",
            minWidth: "900px", // Ensures horizontal scroll on smaller screens
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
              <th style={{ ...tableStyles, width: "8%" }}>Unarchive</th>
              {[
                { key: "id", label: "File ID", width: "15%" },
                { key: "subject", label: "Subject", width: "25%" },
                { key: "upload_date", label: "Date", width: "15%" },
                { key: "uploader", label: "Created by", width: "15%" },
              ].map(({ key, label, width }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    cursor: "pointer",
                    ...tableStyles,
                    width,
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
              <th style={{ ...tableStyles, width: "7%" }}>View File</th>
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
                  <td style={tableStyles}>
                    <Tooltip label="Unarchive file" position="top" withArrow>
                      <ActionIcon
                        variant="light"
                        color="green"
                        onClick={() => openUnarchiveModal(file)}
                        style={{ width: "1.5rem", height: "1.6rem" }}
                      >
                        <ArrowArcLeft size="1rem" />
                      </ActionIcon>
                    </Tooltip>
                  </td>
                  <td style={tableStyles}>{generateFileId(file)}</td>
                  <td style={tableStyles}>{file.subject}</td>
                  <td style={tableStyles}>{convertDate(file.upload_date || file.created_at)}</td>
                  <td style={tableStyles}>
                    {file.uploader}[{file.uploader_designation}]
                  </td>
                  <td style={tableStyles}>
                    <ActionIcon
                      variant="outline"
                      color="blue"
                      onClick={() => handleViewFile(file)}
                      style={{ width: "1.5rem", height: "1.6rem" }}
                    >
                      <Eye size="1rem" />
                    </ActionIcon>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </ScrollArea>
    );
  };

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

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        backgroundColor: "#F5F7F8",
        width: "100%",
        minHeight: "65vh",
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        overflowY: selectedFile ? "hidden" : "auto",
      }}
    >
      {!selectedFile ? (
        <>
          <Group
            position="apart"
            mb="md"
            align="center"
            style={{ flexWrap: "wrap" }}
          >
            <Group spacing="xs" noWrap>
              <FileText size={24} />
              <Title
                order={2}
                style={{
                  fontSize: "24px",
                }}
              >
                Archived Files
              </Title>
            </Group>
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
              position: "relative",
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

            {!loading && filteredFiles.length > 0 && (
              <Group
                position="right"
                style={{
                  backgroundColor: "#fff",
                  padding: "8px 16px",
                  borderTop: "1px solid #ddd",
                  marginTop: "auto",
                  minHeight: "50px",
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
                    total={Math.ceil(filteredFiles.length / itemsPerPage)}
                    value={currentPage}
                    size="sm"
                    onChange={setCurrentPage}
                    boundaries={isMobile ? 0 : 1}
                    siblings={isMobile ? 0 : 1}
                    withEdges={!isMobile}
                  />
                </div>
              </Group>
            )}
          </Box>
        </>
      ) : (
        <div>
          <View
            onBack={handleBack}
            fileID={selectedFile.id}
            updateFiles={() =>
              setFiles(files.filter((f) => f.id !== selectedFile.id))
            }
            isArchived // Pass isArchived prop to View component
          />
        </div>
      )}

      {/* Unarchive Confirmation Modal */}
      <Modal
        opened={confirmUnarchiveModal}
        onClose={() => setConfirmUnarchiveModal(false)}
        title={
          <Text align="center" weight={600} size="lg">
            Confirm Unarchive
          </Text>
        }
        centered
        size={isMobile ? "xs" : "sm"}
      >
        <LoadingOverlay visible={unarchiveLoading} overlayBlur={2} />

        <Paper p="md" withBorder mb="md">
          <Text weight={600} mb="md">
            Are you sure you want to unarchive this file?
          </Text>

          {selectedUnarchiveFile && (
            <>
              <Group spacing="xs" mb="xs">
                <Text weight={500}>Subject:</Text>
                <Text>{selectedUnarchiveFile.subject}</Text>
              </Group>

              <Group spacing="xs" mb="xs">
                <Text weight={500}>File ID:</Text>
                <Text>{generateFileId(selectedUnarchiveFile)}</Text>
              </Group>

              <Group spacing="xs">
                <Text weight={500}>Created by:</Text>
                <Text>
                  {selectedUnarchiveFile.uploader}[
                  {selectedUnarchiveFile.uploader_designation}]
                </Text>
              </Group>
            </>
          )}
        </Paper>

        <Group justify="center" gap="xl" style={{ width: "100%" }}>
          <Button
            onClick={() => handleToggleArchive(selectedUnarchiveFile.id)}
            color="green"
            style={{ width: isMobile ? "100px" : "120px" }}
            loading={unarchiveLoading}
          >
            Unarchive
          </Button>
          <Button
            onClick={() => setConfirmUnarchiveModal(false)}
            variant="outline"
            style={{ width: isMobile ? "100px" : "120px" }}
            disabled={unarchiveLoading}
          >
            Cancel
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
