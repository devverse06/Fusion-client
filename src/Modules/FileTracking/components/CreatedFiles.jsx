import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  FileInput,
  Group,
  Modal,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useSelector } from "react-redux";
import {
  Eye,
  MagnifyingGlass,
  PaperPlaneTilt,
  PencilSimple,
  Folder,
  Upload,
} from "@phosphor-icons/react";

import { getNewFileDetail, listFileTypes, listNewFiles, updateNewFileDetail } from "../api";
import { getApiErrorMessage } from "../utils/apiErrors";
import SendFile from "./SendFile";
import View from "./ViewFile";

const ITEMS_PER_PAGE = 7;

export default function CreatedFiles() {
  const token = localStorage.getItem("authToken");
  const role = useSelector((state) => state.user.role);
  const username = useSelector((state) => state.user.roll_no);
  let currentModule = useSelector((state) => state.module.current_module);
  currentModule = currentModule.split(" ").join("").toLowerCase();

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileToSend, setFileToSend] = useState(null);

  const [editingFile, setEditingFile] = useState(null);
  const [fileTypes, setFileTypes] = useState([]);
  const [editFileTypeId, setEditFileTypeId] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("NORMAL");
  const [editRemarks, setEditRemarks] = useState("");
  const [editAttachments, setEditAttachments] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const [editFiles, setEditFiles] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const convertDate = (date) => {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  const generateFileId = (file) => {
    if (file?.file_number) return file.file_number;
    if (!file || !file.created_at || !file.id) return "Loading...";
    const date = new Date(file.created_at);
    if (Number.isNaN(date.getTime())) return `FTS-#${file.id}`;
    return `FTS-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-#${file.id}`;
  };

  const fetchCreatedFiles = async () => {
    try {
      const data = await listNewFiles(token, { status: "CREATED" });
      const createdOnly = (Array.isArray(data) ? data : []).filter((file) => file?.status === "CREATED");
      setFiles(createdOnly);
    } catch (err) {
      notifications.show({
        title: "Could not load Created Files",
        message: getApiErrorMessage(err, "Please refresh and try again."),
        color: "red",
        position: "top-center",
      });
    }
  };

  useEffect(() => {
    fetchCreatedFiles();
  }, [role, token, username, currentModule]);

  useEffect(() => {
    const fetchFileTypes = async () => {
      try {
        const data = await listFileTypes(token);
        setFileTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        notifications.show({
          title: "Could not load file types",
          message: getApiErrorMessage(err, "Please refresh and try again."),
          color: "red",
          position: "top-center",
        });
      }
    };

    fetchFileTypes();
  }, [token]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return files.filter((file) => {
      const idString = (file.file_number || "").toLowerCase();
      const subject = (file.subject || "").toLowerCase();
      const status = (file.status || "").toLowerCase();
      const date = convertDate(file.created_at).toLowerCase();
      return (
        idString.includes(q) ||
        subject.includes(q) ||
        status.includes(q) ||
        date.includes(q)
      );
    });
  }, [files, searchQuery]);

  const pagedFiles = filteredFiles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredFiles.length);

  const openEditModal = async (file) => {
    try {
      const detail = await getNewFileDetail(file.id, token);
      const selectedFile = detail || file;
      setEditingFile(selectedFile);
      setEditFileTypeId(selectedFile?.file_type?.id ? String(selectedFile.file_type.id) : "");
      setEditSubject(selectedFile?.subject || "");
      setEditDescription(selectedFile?.description || "");
      setEditPriority(selectedFile?.priority || "NORMAL");
      setEditRemarks("");
      setEditAttachments(Array.isArray(selectedFile?.attachments) ? selectedFile.attachments : []);
      setRemovedAttachmentIds([]);
      setEditFiles([]);
    } catch (err) {
      notifications.show({
        title: "Could not load file details",
        message: getApiErrorMessage(err, "Please try again."),
        color: "red",
        position: "top-center",
      });
    }
  };

  const closeEditModal = () => {
    if (isUpdating) return;
    setEditingFile(null);
    setEditFileTypeId("");
    setEditSubject("");
    setEditDescription("");
    setEditPriority("NORMAL");
    setEditRemarks("");
    setEditAttachments([]);
    setRemovedAttachmentIds([]);
    setEditFiles([]);
  };

  const handleUpdateFile = async () => {
    if (!editingFile) return;

    if (!editFileTypeId) {
      notifications.show({
        title: "File type is required",
        message: "Please select a file type before saving.",
        color: "orange",
        position: "top-center",
      });
      return;
    }

    const trimmedSubject = editSubject.trim();
    if (!trimmedSubject) {
      notifications.show({
        title: "Subject is required",
        message: "Please enter a subject before saving.",
        color: "orange",
        position: "top-center",
      });
      return;
    }

    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append("file_type_id", editFileTypeId);
      formData.append("subject", trimmedSubject);
      formData.append("description", editDescription);
      formData.append("priority", editPriority);
      if (editRemarks.trim()) {
        formData.append("remarks", editRemarks.trim());
      }
      removedAttachmentIds.forEach((attachmentId) => {
        formData.append("remove_attachment_ids", String(attachmentId));
      });
      if (Array.isArray(editFiles) && editFiles.length > 0) {
        editFiles.forEach((file) => formData.append("files", file));
      }

      await updateNewFileDetail(editingFile.id, formData, token);

      notifications.show({
        title: "File updated",
        message: "Changes were saved in Created Files.",
        color: "green",
        position: "top-center",
      });

      closeEditModal();
      fetchCreatedFiles();
    } catch (err) {
      notifications.show({
        title: "Update failed",
        message: getApiErrorMessage(err, "Could not update the file."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditFilesChange = (uploadedFiles) => {
    if (!uploadedFiles) {
      setEditFiles([]);
      return;
    }

    const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    setEditFiles(fileArray);
  };

  const handleAttachmentToggle = (attachmentId) => {
    setRemovedAttachmentIds((prev) => {
      const idNumber = Number(attachmentId);
      if (prev.includes(idNumber)) {
        return prev.filter((id) => id !== idNumber);
      }
      return [...prev, idNumber];
    });
  };
  return (
    <Card
      shadow="sm"
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
      <Group position="apart" mb="md" align="center" grow>
        <Title order={2}>Created Files</Title>
        <TextInput
          placeholder="Search created files..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          style={{ width: isMobile ? "100%" : "auto", maxWidth: isMobile ? "100%" : "360px" }}
          icon={<MagnifyingGlass size={16} />}
        />
      </Group>

      {selectedFile ? (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Title
            order={3}
            mb="md"
            style={{
              fontSize: isMobile ? "22px" : "26px",
              textAlign: "center",
            }}
          >
            {selectedFile.subject}
          </Title>
          <View onBack={() => setSelectedFile(null)} fileID={selectedFile.id} updateFiles={fetchCreatedFiles} />
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
          }}
        >
          <ScrollArea style={{ flex: 1 }}>
            {pagedFiles.length > 0 ? (
              <Table
                highlightOnHover
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  fontSize: "14px",
                  minWidth: "860px",
                }}
              >
                <thead style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: "10px", border: "1px solid #ddd", width: "17%" }}>File ID</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", width: "30%" }}>Subject</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", width: "18%" }}>Created On</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", width: "12%" }}>Status</th>
                    <th style={{ padding: "10px", border: "1px solid #ddd", width: "23%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFiles.map((file) => (
                    <tr key={file.id}>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                        {generateFileId(file)}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                        {file.subject || "-"}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                        {convertDate(file.created_at)}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                        <Badge color="yellow" variant="light">
                          Created
                        </Badge>
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ddd", textAlign: "center" }}>
                        <Group position="center" spacing={8}>
                          <Tooltip label="View File" withArrow>
                            <ActionIcon variant="light" color="blue" onClick={() => setSelectedFile(file)}>
                              <Eye size="1rem" />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Edit File" withArrow>
                            <ActionIcon variant="light" color="grape" onClick={() => openEditModal(file)}>
                              <PencilSimple size="1rem" />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Send to Outbox" withArrow>
                            <ActionIcon variant="light" color="cyan" onClick={() => setFileToSend(file)}>
                              <PaperPlaneTilt size="1rem" />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Center style={{ height: "220px" }}>
                <Stack align="center" spacing="xs">
                  <Folder size={48} color={theme.colors.gray[5]} />
                  <Text c="dimmed" size="lg">
                    No files in Created Files
                  </Text>
                </Stack>
              </Center>
            )}
          </ScrollArea>

          <Group
            position="right"
            style={{
              backgroundColor: "#fff",
              padding: "8px 16px",
              borderTop: "1px solid #ddd",
              minHeight: "60px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              justifyContent: isMobile ? "center" : "flex-end",
            }}
          >
            <Text size="sm" color="dimmed">
              {`Showing ${filteredFiles.length > 0 ? startIndex + 1 : 0}-${endIndex} of ${filteredFiles.length} files`}
            </Text>
            <Pagination
              total={Math.ceil(filteredFiles.length / ITEMS_PER_PAGE) || 1}
              value={currentPage}
              size="sm"
              onChange={setCurrentPage}
              boundaries={isMobile ? 0 : 1}
              siblings={isMobile ? 0 : 1}
              withEdges={!isMobile}
            />
          </Group>
        </Box>
      )}

      <SendFile file={fileToSend} onClose={() => setFileToSend(null)} onSuccess={fetchCreatedFiles} />

      <Modal opened={!!editingFile} onClose={closeEditModal} title="Edit Created File" centered size="lg">
        <Stack spacing="sm">
          <Select
            label="File Type"
            value={editFileTypeId}
            onChange={(value) => setEditFileTypeId(value || "")}
            data={fileTypes.map((type) => ({ value: String(type.id), label: type.name }))}
            searchable
            nothingFoundMessage="No file types found"
            required
          />
          <TextInput label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.currentTarget.value)} required />
          <Textarea label="Description" minRows={4} value={editDescription} onChange={(e) => setEditDescription(e.currentTarget.value)} />
          <Select
            label="Priority"
            value={editPriority}
            onChange={(value) => setEditPriority(value || "NORMAL")}
            data={[
              { value: "LOW", label: "Low" },
              { value: "NORMAL", label: "Normal" },
              { value: "HIGH", label: "High" },
              { value: "URGENT", label: "Urgent" },
            ]}
          />
          <Textarea
            label="Remarks"
            minRows={3}
            placeholder="Optional update note"
            value={editRemarks}
            onChange={(e) => setEditRemarks(e.currentTarget.value)}
          />
          <Divider label="Existing attachments" labelPosition="center" />
          {Array.isArray(editAttachments) && editAttachments.length > 0 ? (
            <Stack spacing={6}>
              {editAttachments.map((attachment) => (
                <Checkbox
                  key={attachment.id}
                  checked={!removedAttachmentIds.includes(Number(attachment.id))}
                  onChange={() => handleAttachmentToggle(attachment.id)}
                  label={attachment.name || `Attachment ${attachment.id}`}
                />
              ))}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              No attachments on this file yet.
            </Text>
          )}
          <FileInput
            label="Add attachments"
            placeholder="Upload new attachments"
            accept="application/pdf,image/jpeg,image/png"
            icon={<Upload size={16} />}
            value={editFiles}
            onChange={handleEditFilesChange}
            multiple
            clearable
          />
          <Text size="xs" c="dimmed">
            Uncheck an existing attachment to remove it. Newly uploaded attachments are added on save.
          </Text>
          <Group position="right" mt="sm">
            <Button variant="outline" onClick={closeEditModal} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFile} loading={isUpdating}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
