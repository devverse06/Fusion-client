"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  Title,
  Table,
  Button,
  ActionIcon,
  Tooltip,
  Modal,
  Text,
  Group,
  TextInput,
  Pagination,
  Stack,
  Divider,
  ScrollArea,
  useMantineTheme,
} from "@mantine/core";
import {
  CaretUp,
  CaretDown,
  ArrowsDownUp,
  PencilSimple,
  Trash,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks";
import axios from "axios";
import { useSelector } from "react-redux";
import EditDraft from "./EditDraft";
import {
  newDeleteDraftRoute,
  newDraftsRoute,
} from "../../../routes/filetrackingRoutes";

export default function Draft() {
  const [files, setFiles] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const itemsPerPage = 7;
  const theme = useMantineTheme();

  // Media query for responsive design
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const token = localStorage.getItem("authToken");
  const role = useSelector((state) => state.user.role);
  const username = useSelector((state) => state.user.roll_no);
  let current_module = useSelector((state) => state.module.current_module);
  current_module = current_module.split(" ").join("").toLowerCase();

  useEffect(() => {
    const getFiles = async () => {
      try {
        const response = await axios.get(`${newDraftsRoute}`, {
          params: {
            username,
            designation: role,
            src_module: current_module,
          },
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        setFiles(response.data);
        console.log(response.data);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    getFiles();
  }, [username, role, current_module, token]);

  const [editFile, setEditFile] = useState(null); // File being edited

  const getDraftField = (file, key) => {
    if (!file) return "";
    const extra = file.draft_data || file.file_extra_JSON || {};
    return (extra[key] || file[key] || "").toString();
  };

  const handleDeleteFile = async (fileID) => {
    try {
      await axios.delete(`${newDeleteDraftRoute(fileID)}?confirm=true`, {
        withCredentials: true,
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileID));
      notifications.show({
        title: "Draft deleted",
        message: "The draft has been successfully deleted",
        color: "red",
      });
    } catch (err) {
      console.error("Error deleting draft:", err);
      notifications.show({
        title: "Delete failed",
        message: err?.response?.data?.error || "Could not delete draft. Please try again.",
        color: "red",
      });
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    if (sortConfig.key === "file_id") {
      return direction * (a.id - b.id);
    }

    if (sortConfig.key === "subject") {
      const aSubject = (a?.file_extra_JSON?.subject || a?.subject || "").toString();
      const bSubject = (b?.file_extra_JSON?.subject || b?.subject || "").toString();
      return direction * aSubject.localeCompare(bSubject);
    }

    if (sortConfig.key === "description") {
      const aDescription = (a?.file_extra_JSON?.description || a?.description || "").toString();
      const bDescription = (b?.file_extra_JSON?.description || b?.description || "").toString();
      return direction * aDescription.localeCompare(bDescription);
    }

    if (sortConfig.key === "remarks") {
      const aRemarks = (a?.file_extra_JSON?.remarks || a?.remarks || "").toString();
      const bRemarks = (b?.file_extra_JSON?.remarks || b?.remarks || "").toString();
      return direction * aRemarks.localeCompare(bRemarks);
    }

    return direction * (a[sortConfig.key] > b[sortConfig.key] ? 1 : -1);
  });

  const filteredFiles = sortedFiles.filter((file) => {
    const fileDate = file?.upload_date || file?.created_at;
    const parsedDate = fileDate ? new Date(fileDate) : null;
    const idString = file?.file_number
      ? file.file_number
      : parsedDate && !Number.isNaN(parsedDate.getTime())
        ? `${file.branch || "FTS"}-${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1).toString().padStart(2, "0")}-#${file.id}`
        : `FTS-#${file?.id || ""}`;
    const subject = getDraftField(file, "subject").toLowerCase();
    const description = getDraftField(file, "description").toLowerCase();
    const remarks = getDraftField(file, "remarks").toLowerCase();
    const uploader = (file?.uploader || file?.created_by || "").toLowerCase();
    return (
      idString.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.includes(searchQuery.toLowerCase()) ||
      uploader.includes(searchQuery.toLowerCase()) ||
      description.includes(searchQuery.toLowerCase()) ||
      remarks.includes(searchQuery.toLowerCase())
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

  // Delete modal functions
  const openDeleteModal = (file) => {
    setSelectedFile(file);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedFile) {
      handleDeleteFile(selectedFile.id);
      setShowDeleteModal(false);
      setSelectedFile(null);
    }
  };

  const handleEditFile = (file) => {
    setEditFile(file); // Set the file to edit mode
  };

  const handleBack = () => {
    setEditFile(null); // Exit edit mode and go back
  };

  // Mobile card view rendering
  const renderMobileView = () => {
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
              <Text weight={600} size="md" mb={6}>
                {getDraftField(file, "subject") || "-"}
              </Text>

              <Divider my="xs" />

              <Text size="sm" mb={8}>
                <Text span weight={500}>
                  Description:
                </Text>{" "}
                {getDraftField(file, "description") || "-"}
              </Text>

              <Text size="sm" mb={8}>
                <Text span weight={500}>
                  Remarks:
                </Text>{" "}
                {getDraftField(file, "remarks") || "-"}
              </Text>

              <Group position="apart" mt="xs">
                <Text size="sm">
                  <Text span weight={500}>
                    Created by:
                  </Text>{" "}
                  {file.uploader}
                </Text>
                <Text size="sm" color="dimmed">
                  {file.uploader_designation}
                </Text>
                <Text size="sm" color="dimmed">
                  {new Date(file.upload_date || file.created_at).toLocaleString()}
                </Text>
              </Group>

              <Group position="apart" mt="md">
                <Tooltip label="Edit Draft" position="top" withArrow>
                  <Button
                    variant="light"
                    color="blue"
                    size="xs"
                    leftIcon={<PencilSimple size="1rem" />}
                    onClick={() => handleEditFile(file)}
                  >
                    Edit
                  </Button>
                </Tooltip>

                <Tooltip label="Delete Draft" position="top" withArrow>
                  <Button
                    variant="light"
                    color="red"
                    size="xs"
                    leftIcon={<Trash size="1rem" />}
                    onClick={() => openDeleteModal(file)}
                  >
                    Delete
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
              {[
                { key: "subject", label: "Subject" },
                { key: "description", label: "Description" },
                { key: "remarks", label: "Remarks" },
                { key: "upload_date", label: "Date" },
                { key: "uploader", label: "Created By" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    cursor: "pointer",
                    padding: "10px",
                    width: "14%",
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
                  width: "7%",
                  border: "1px solid #ddd",
                  height: "36px",
                }}
              >
                Edit
              </th>
              <th
                style={{
                  padding: "6px",
                  width: "7%",
                  border: "1px solid #ddd",
                  height: "36px",
                }}
              >
                Delete
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
                      padding: "6px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                      height: "36px",
                    }}
                  >
                    {getDraftField(file, "subject") || "-"}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                      height: "36px",
                    }}
                  >
                    {getDraftField(file, "description") || "-"}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                      height: "36px",
                    }}
                  >
                    {getDraftField(file, "remarks") || "-"}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      border: "1px solid #ddd",
                      height: "36px",
                    }}
                  >
                    {new Date(file.upload_date || file.created_at).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                      height: "36px",
                    }}
                  >
                    {file.uploader || file.created_by || "-"}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      textAlign: "center",
                      border: "1px solid #ddd",
                      height: "36px",
                    }}
                  >
                    <Tooltip label="Edit Draft" position="top" withArrow>
                      <ActionIcon
                        variant="light"
                        color="black"
                        style={{
                          transition: "background-color 0.3s",
                          width: "2rem",
                          height: "2rem",
                        }}
                        onClick={() => handleEditFile(file)}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#E3F2FD";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                      >
                        <PencilSimple size="1rem" />
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
                    <Tooltip label="Delete Draft" position="top" withArrow>
                      <ActionIcon
                        variant="light"
                        color="red"
                        style={{
                          transition: "background-color 0.3s",
                          width: "2rem",
                          height: "2rem",
                        }}
                        onClick={() => openDeleteModal(file)}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#ffebee";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                      >
                        <Trash size="1rem" />
                      </ActionIcon>
                    </Tooltip>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <>
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
          overflowY: "auto",
        }}
      >
        {!editFile && (
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
              Drafts
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
        )}

        {editFile ? (
          <EditDraft
            file={editFile}
            onBack={handleBack}
            deleteDraft={handleDeleteFile}
          />
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
                  total={Math.ceil(filteredFiles.length / itemsPerPage)}
                  value={currentPage}
                  onChange={(page) => {
                    setCurrentPage(page);
                    setPageInput("");
                  }}
                  size="sm"
                  boundaries={isMobile ? 0 : 1}
                  siblings={isMobile ? 0 : 1}
                  withEdges={!isMobile}
                />
              </div>
            </Group>
          </Box>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={
          <Text align="center" weight={600} size="lg">
            Confirm Deletion
          </Text>
        }
        centered
        size={isMobile ? "xs" : "md"}
      >
        <Text weight={600} mb="ls">
          Do you want to delete this file?
        </Text>
        {selectedFile && (
          <>
            <Text mb="ls">
              Subject: {getDraftField(selectedFile, "subject") || "-"}
            </Text>
            <Text mb="md">File ID: #{selectedFile.id}</Text>
          </>
        )}
        <Group justify="center" gap="xl" style={{ width: "100%" }}>
          <Button
            onClick={confirmDelete}
            color="blue"
            style={{ width: isMobile ? "100px" : "120px" }}
          >
            Confirm
          </Button>
          <Button
            onClick={() => setShowDeleteModal(false)}
            variant="outline"
            style={{ width: isMobile ? "100px" : "120px" }}
          >
            Cancel
          </Button>
        </Group>
      </Modal>
    </>
  );
}
