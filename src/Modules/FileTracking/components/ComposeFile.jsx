import React, { useEffect } from "react";
import {
  Box,
  Button,
  Card,
  FileInput,
  TextInput,
  Textarea,
  Title,
  ActionIcon,
  Text,
  Select,
  Group,
  Autocomplete,
  Grid,
  Modal,
  Paper,
} from "@mantine/core";
import {
  Upload,
  FloppyDisk,
  PaperPlaneTilt,
  Trash,
} from "@phosphor-icons/react";
import { notifications } from "@mantine/notifications";
import { useSelector } from "react-redux";
import axios from "axios";
import { ChatCenteredText } from "phosphor-react";
import {
  getUsernameRoute,
  newFilesRoute,
  newDraftsRoute,
  newFileTypesRoute,
} from "../../../routes/filetrackingRoutes";
import { getApiErrorMessage } from "../utils/apiErrors";

axios.defaults.withCredentials = true;

export default function Compose() {
  const [files, setFiles] = React.useState([]);
  const [usernameSuggestions, setUsernameSuggestions] = React.useState([]);
  const username = useSelector((state) => state.user.roll_no);
  const [receiver_username, setReceiverUsername] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [fileTypeId, setFileTypeId] = React.useState("");
  const [priority, setPriority] = React.useState("NORMAL");
  const [fileTypes, setFileTypes] = React.useState([]);
  const token = localStorage.getItem("authToken");
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const roles = useSelector((state) => state.user.roles);
  let module = useSelector((state) => state.module.current_module);
  module = module.split(" ").join("").toLowerCase();
  const uploaderRole = useSelector((state) => state.user.role);
  const [designation, setDesignation] = React.useState("");
  const options = Array.isArray(roles)
    ? roles.map((role) => ({ value: role, label: role }))
    : [];
  const validateAttachments = (uploadedFiles) => {
    if (!uploadedFiles) {
      return { valid: [], invalidMessages: [] };
    }

    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const maxSizeBytes = 10 * 1024 * 1024;
    const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    const valid = [];
    const invalidMessages = [];

    fileArray.forEach((file) => {
      const fileName = file?.name || "file";
      const dotIndex = fileName.lastIndexOf(".");
      const ext = dotIndex >= 0 ? fileName.substring(dotIndex).toLowerCase() : "";

      if (!allowedExtensions.includes(ext)) {
        invalidMessages.push(`Unsupported attachment type: ${fileName}. Allowed: PDF, JPG, JPEG, PNG`);
        return;
      }

      if ((file?.size || 0) > maxSizeBytes) {
        invalidMessages.push(`Attachment too large: ${fileName}. Max size is 10MB`);
        return;
      }

      valid.push(file);
    });

    return { valid, invalidMessages };
  };

  const handleFileChange = (uploadedFiles) => {
    const { valid, invalidMessages } = validateAttachments(uploadedFiles);

    invalidMessages.forEach((message) => {
      notifications.show({
        title: "Invalid file",
        message,
        color: "red",
        position: "top-center",
      });
    });

    if (!uploadedFiles) {
      setFiles([]);
      return;
    }

    setFiles((prevFiles) => {
      const existing = Array.isArray(prevFiles) ? prevFiles : [];
      const existingNames = new Set(existing.map((f) => (f?.name || "").toLowerCase()));
      const dedupedToAdd = [];

      valid.forEach((file) => {
        const normalizedName = (file?.name || "").toLowerCase();
        if (!normalizedName) {
          return;
        }

        if (existingNames.has(normalizedName)) {
          notifications.show({
            title: "Duplicate file name",
            message: `A file named ${file.name} is already attached.`,
            color: "red",
            position: "top-center",
          });
          return;
        }

        existingNames.add(normalizedName);
        dedupedToAdd.push(file);
      });

      return [...existing, ...dedupedToAdd];
    });
  };
  const removeFile = () => {
    setFiles([]);
  };
  const postSubmit = () => {
    setFiles([]);
    setFileTypeId("");
    setPriority("NORMAL");
    setDesignation("");
    setReceiverUsername("");
    setSubject("");
    setDescription("");
    setRemarks("");
  };
  useEffect(() => {
    setDesignation(roles && Array.isArray(roles) && roles.length > 0 ? roles[0] : '');
  }, [roles]);

  useEffect(() => {
    let isMounted = true;
    const getUsernameSuggestion = async () => {
      try {
        const response = await axios.post(
          `${getUsernameRoute}`,
          { value: receiver_username },
          {
            headers: { Authorization: `Token ${token}` },
          },
        );
        const users = JSON.parse(response.data.users);
        if (response.data && Array.isArray(users)) {
          const suggestedUsernames = users.map((user) => user.fields.username);
          if (isMounted) {
            setUsernameSuggestions(suggestedUsernames);
          }
        }
      } catch (error) {
        console.error("Error fetching username suggestion:", error);
      }
    };

    if (receiver_username) {
      getUsernameSuggestion();
    }

    return () => {
      isMounted = false;
    };
  }, [receiver_username, token]);

  useEffect(() => {
    const fetchFileTypes = async () => {
      try {
        const response = await axios.get(`${newFileTypesRoute}`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        setFileTypes(response.data);
      } catch (err) {
        console.error("Error fetching file types:", err);
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

  const handleSaveDraft = async () => {
    if (isSavingDraft) return;

    if (!fileTypeId || !subject) {
      notifications.show({
        title: "Draft save failed",
        message: "Please choose file type and subject at minimum.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    if (!remarks || remarks.trim().length < 5) {
      notifications.show({
        title: "Draft save failed",
        message: "Please enter a mandatory comment (minimum 5 characters).",
        color: "red",
        position: "top-center",
      });
      return;
    }

    try {
      setIsSavingDraft(true);
      const formData = new FormData();
      formData.append("file_type_id", String(fileTypeId));
      formData.append("subject", subject);
      formData.append("description", description);
      formData.append("remarks", remarks);
      formData.append("priority", priority);
      if (Array.isArray(files) && files.length > 0) {
        files.forEach((fileItem) => formData.append("files", fileItem));
      }

      await axios.post(
        `${newDraftsRoute}`,
        formData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      notifications.show({
        title: "Draft saved successfully",
        message: "The draft has been saved successfully.",
        color: "green",
        position: "top-center",
      });
      postSubmit();
    } catch (err) {
      console.log(err);
      notifications.show({
        title: "Draft save error",
        message: getApiErrorMessage(err, "Could not save draft. Please try again."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCreateFile = () => {
    if (!subject || !description || !fileTypeId) {
      notifications.show({
        title: "Incomplete Form",
        message: "Please select file type, subject, and description before submitting.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    if (!remarks || remarks.trim().length < 5) {
      notifications.show({
        title: "Incomplete Form",
        message: "Please enter a mandatory comment (minimum 5 characters).",
        color: "red",
        position: "top-center",
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const finalSubmit = async () => {
    if (isSubmitting) return;

    setShowConfirmModal(false);
    if (!fileTypeId || !subject) {
      notifications.show({
        title: "Submit failed",
        message: "Please select file type and enter subject before submit.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("file_type_id", String(fileTypeId));
      formData.append("subject", subject);
      formData.append("description", description);
      formData.append("priority", priority);
      formData.append("remarks", remarks);
      formData.append("action", "create");
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post(
        `${newFilesRoute}`,
        formData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.status === 201) {
        notifications.show({
          title: "File created successfully",
          message: `File created: ${response.data.file_number}`,
          color: "green",
          position: "top-center",
        });
        postSubmit();
      }
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "File creation error",
        message: getApiErrorMessage(err, "Could not create file. Please try again."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className="inbox-card"
      style={{
        backgroundColor: "#F5F7F8",
        width: "100%",
        minHeight: "70vh",
        maxHeight: "70vh",
        overflowY: "auto",
      }}
    >
      <Box
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginLeft: "auto",
          width: "fit-content",
        }}
      >
        <ActionIcon
          size="lg"
          variant="outline"
          color="blue"
          disabled={isSavingDraft || isSubmitting}
          onClick={() => handleSaveDraft()}
          title="Save as Draft"
        >
          <FloppyDisk size={20} />
        </ActionIcon>
        <Text color="blue" size="xs" mt={4}>
          Save as Draft
        </Text>
      </Box>

      <Title
        order={2}
        mb="md"
        style={{
          fontSize: "24px",
        }}
      >
        Compose File
      </Title>
      <Box
        component="form"
        onSubmit={(e) => e.preventDefault()}
        style={{
          backgroundColor: "#F5F7F8",
          padding: "16px",
        }}
      >
        <TextInput
          label="Title of File"
          placeholder="Enter file title"
          mb="sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="Enter description (2500 letters maximum)"
          mb="sm"
          value={description}
          onChange={(e) => {
            if (description.length < 2500) {
              setDescription(e.currentTarget.value);
            }
          }}
          required
        />
        <Text
          align="right"
          size="sm"
          c={description.length >= 200 ? "red" : "dimmed"}
        >
          {description.length} / 2500 letters
        </Text>

        <Select
          label="File Type"
          placeholder="Select file type"
          value={fileTypeId}
          data={fileTypes.map((type) => ({ value: String(type.id), label: type.name }))}
          onChange={(value) => setFileTypeId(value || "")}
          searchable
          nothingFoundMessage="No file types found"
          mb="sm"
        />

        <Select
          label="Priority"
          placeholder="Select priority"
          value={priority}
          data={[
            { value: "LOW", label: "Low" },
            { value: "NORMAL", label: "Normal" },
            { value: "HIGH", label: "High" },
            { value: "URGENT", label: "Urgent" },
          ]}
          onChange={(value) => setPriority(value)}
          mb="sm"
        />

        <Textarea
          label="Remarks"
          placeholder="Enter remarks (500 characters maximum)"
          value={remarks}
          onChange={(e) => {
            if (remarks.length < 500) {
              setRemarks(e.currentTarget.value);
            }
          }}
          mb="xs"
          minRows={3}
          required
          icon={<ChatCenteredText size={16} />}
        />
        <Text
          align="right"
          size="sm"
          c={remarks.length >= 450 ? "red" : "dimmed"}
        >
          {remarks.length} / 500 letters
        </Text>
        <Select
          label="Designation"
          placeholder="Sender's Designation"
          value={designation}
          data={options}
          mb="sm"
          onChange={(value) => setDesignation(value)}
        />
        <FileInput
          label="Attach file (PDF, JPG, PNG) (MAX: 10MB)"
          placeholder="Upload file"
          accept="application/pdf,image/jpeg,image/png"
          icon={<Upload size={16} />}
          value={files}
          onChange={handleFileChange}
          mb="sm"
          multiple
        />
        {Array.isArray(files) && files.length > 0 && (
          <Group position="apart" mt="sm">
            <Button
              leftSection={<Trash size={16} />}
              color="red"
              onClick={removeFile}
              compact
            >
              Remove File
            </Button>
          </Group>
        )}
        <Button
          type="submit"
          color="blue"
          disabled={isSavingDraft || isSubmitting}
          style={{
            display: "block",
            margin: "0 auto",
            width: "200px",
          }}
          onClick={handleCreateFile}
        >
          {isSubmitting ? "Creating..." : "Create File"}
        </Button>
      </Box>

      <Modal
        opened={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={
          <Text align="center" weight={600} size="lg">
            Confirm File Creation
          </Text>
        }
        centered
        size="md"
      >
        <Paper p="md" withBorder mb="md">
          <Text weight={600} mb="md" size="md">
            Do you want to create this file and keep it in Created Files?
          </Text>

          <Grid>
            <Grid.Col span={5}>
              <Text weight={500}>Sender:</Text>
            </Grid.Col>
            <Grid.Col span={7}>
              <Text>
                {username} [{designation}]
              </Text>
            </Grid.Col>
          </Grid>
        </Paper>

        <Group justify="center" gap="xl" style={{ width: "100%" }}>
          <Button
            onClick={finalSubmit}
            color="blue"
            loading={isSubmitting}
            disabled={isSavingDraft}
            style={{ width: "120px" }}
            radius="md"
            leftSection={<PaperPlaneTilt size={16} />}
          >
            Confirm
          </Button>
          <Button
            onClick={() => setShowConfirmModal(false)}
            variant="outline"
            style={{ width: "120px" }}
            radius="md"
          >
            Cancel
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
