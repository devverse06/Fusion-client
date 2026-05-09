/* eslint-disable react/prop-types */
/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from "react";
import {
  Card,
  Title,
  TextInput,
  FileInput,
  Button,
  Textarea,
  Box,
  Group,
} from "@mantine/core";
import { ArrowLeft, Upload } from "@phosphor-icons/react";
import { notifications } from "@mantine/notifications";
import axios from "axios";
import { useSelector } from "react-redux";
import { Trash } from "phosphor-react";
import {
  newFilesRoute,
} from "../../../routes/filetrackingRoutes";

// eslint-disable-next-line react/prop-types
export default function EditDraft({ file, onBack, deleteDraft }) {
  // Initialize state with data from the draft (file prop)
  const draftData = file?.draft_data || file?.file_extra_JSON || {};

  const draftSubject = draftData.subject || file?.subject || "";
  const draftDescription = draftData.description || file?.description || "";
  const draftRemarks = draftData.remarks || file?.remarks || "";

  const [title, setTitle] = useState(draftSubject);
  // eslint-disable-next-line no-unused-vars
  const [description, setDescription] = useState(draftDescription);
  const [remarks, setRemarks] = useState(draftRemarks);
  const [attachedFile, setAttachedFile] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState(
    Array.isArray(draftData.attachments) ? draftData.attachments : [],
  );
  const token = localStorage.getItem("authToken");
  let module = useSelector((state) => state.module.current_module);
  module = module.split(" ").join("").toLowerCase();
  const uploaderRole = useSelector((state) => state.user.role);
  // eslint-disable-next-line no-unused-vars
  const [designation, setDesignation] = useState(uploaderRole);
  useEffect(() => {
    const nextDraftData = file?.draft_data || file?.file_extra_JSON || {};
    setTitle(nextDraftData.subject || file?.subject || "");
    setDescription(nextDraftData.description || file?.description || "");
    setRemarks(nextDraftData.remarks || file?.remarks || "");
    setAttachedFile(null);
    setExistingAttachments(
      Array.isArray(nextDraftData.attachments) ? nextDraftData.attachments : [],
    );
  }, [file]);

  const removeFile = () => {
    setAttachedFile(null);
    setExistingAttachments([]);
  };

  const handleFileChange = (uploadedFile) => {
    setAttachedFile(uploadedFile);
    if (uploadedFile) {
      setExistingAttachments([]);
    }
  };

  const decodeBase64ToFile = (attachment, index) => {
    if (!attachment?.content_b64) return null;
    try {
      const binary = atob(attachment.content_b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const name = attachment.name || `draft-attachment-${index + 1}`;
      const contentType = attachment.content_type || "application/octet-stream";
      return new File([bytes], name, { type: contentType });
    } catch (error) {
      console.error("Failed to decode draft attachment", error);
      return null;
    }
  };
  const handleSaveDraft = async () => {
    if (!title || !description || !remarks || remarks.trim().length < 5) {
      notifications.show({
        title: "Incomplete form",
        message: "Title, description and remark (minimum 5 characters) are required.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    if (!file?.id || !file?.file_type_id) {
      notifications.show({
        title: "Draft data missing",
        message: "Draft does not contain required information.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    try {
      const formData = new FormData();
      const filesToUpload = [];

      if (attachedFile instanceof File) {
        filesToUpload.push(attachedFile);
      } else if (existingAttachments.length > 0) {
        existingAttachments.forEach((attachment, index) => {
          const converted = decodeBase64ToFile(attachment, index);
          if (converted) {
            filesToUpload.push(converted);
          }
        });
      }

      filesToUpload.forEach((fileItem) => {
        if (fileItem instanceof File) {
          formData.append("files", fileItem);
        }
      });

      formData.append("file_type_id", String(file.file_type_id));
      formData.append("subject", title);
      formData.append("description", description);
      formData.append("remarks", remarks);
      formData.append("priority", draftData.priority || "NORMAL");
      formData.append("action", "draft");

      const response = await axios.post(`${newFilesRoute}`, formData, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        notifications.show({
          title: "Draft saved successfully",
          message: "Your draft has been updated.",
          color: "green",
          position: "top-center",
        });
        onBack();
      }
    } catch (err) {
      notifications.show({
        title: "Save draft failed",
        message: err?.response?.data?.error || "Could not save draft. Please try again.",
        color: "red",
        position: "top-center",
      });
    }
  };

  const handleSubmitDraft = async () => {
    if (!title || !description || !remarks || remarks.trim().length < 5) {
      notifications.show({
        title: "Incomplete form",
        message: "Title, description and remark (minimum 5 characters) are required.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    if (!file?.file_type_id) {
      notifications.show({
        title: "Draft data missing",
        message: "Draft does not contain file type information. Please recreate the draft.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    try {
      const formData = new FormData();
      const filesToUpload = [];

      if (attachedFile instanceof File) {
        filesToUpload.push(attachedFile);
      } else if (existingAttachments.length > 0) {
        existingAttachments.forEach((attachment, index) => {
          const converted = decodeBase64ToFile(attachment, index);
          if (converted) {
            filesToUpload.push(converted);
          }
        });
      }

      filesToUpload.forEach((fileItem) => {
        if (fileItem instanceof File) {
          formData.append("files", fileItem);
        }
      });

      formData.append("file_type_id", String(file.file_type_id));
      formData.append("subject", title);
      formData.append("description", description);
      formData.append("remarks", remarks);
      formData.append("priority", draftData.priority || "NORMAL");
      formData.append("action", "submit");

      const response = await axios.post(`${newFilesRoute}`, formData, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        notifications.show({
          title: "File created successfully",
          message: "Draft has been submitted as a file. Go to Created Files to send it.",
          color: "green",
          position: "top-center",
        });
        deleteDraft(file.id);
        onBack();
      }
    } catch (err) {
      notifications.show({
        title: "Submit failed",
        message: err?.response?.data?.error || "Could not submit draft. Please try again.",
        color: "red",
        position: "top-center",
      });
    }
  };

  return (
    <Card
      // shadow="sm" padding="lg" radius="md" withBorder
      shadow="sm"
      padding="lg"
      radius="m"
      withBorder
      style={{
        backgroundColor: "#F5F7F8",
        // position: "absolute",
        height: "70vh",
        width: "90vw",
        overflowY: "auto",
      }}
    >
      <Box
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <Button
          variant="subtle"
          onClick={onBack}
          style={{ marginRight: "1rem" }}
        >
          <ArrowLeft size={24} />
        </Button>
        <Title order={3} style={{ flexGrow: 1, textAlign: "center" }}>
          Edit Draft: {title}
        </Title>
      </Box>

      <TextInput
        label="Title"
        placeholder="Enter Title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        mb="sm"
      />
      <Textarea
        label="Description"
        placeholder="Enter your description here"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        mb="sm"
      />
      <FileInput
        label="Attach file (PDF, JPG, PNG) (MAX: 10MB)"
        accept="application/pdf,image/jpeg,image/png"
        icon={<Upload size={16} />}
        placeholder="Choose file"
        value={attachedFile}
        onChange={handleFileChange}
        mb="sm"
        withAsterisk
      />
      {existingAttachments.length > 0 && !attachedFile && (
        <Box mb="sm">
          <strong>Saved attachment{existingAttachments.length > 1 ? "s" : ""}:</strong>
          {existingAttachments.map((attachment, idx) => (
            <Box key={`${attachment?.name || "attachment"}-${idx}`}>
              {attachment?.name || `Attachment ${idx + 1}`}
            </Box>
          ))}
        </Box>
      )}
      {attachedFile && (
        <Group position="apart" mt="sm">
          <Button
            leftIcon={<Trash size={16} />}
            color="red"
            onClick={removeFile}
            compact
          >
            Remove File
          </Button>
        </Group>
      )}
      <Textarea
        label="Remark"
        placeholder="Enter remark"
        mb="sm"
        value={remarks}
        onChange={(e) => setRemarks(e.currentTarget.value)}
      />

      {/* ✅ Draft Edit: Two actions only - Save Draft or Submit as File */}

      <Box
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "auto",
        }}
      >
        <Button
          variant="light"
          style={{
            width: "150px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={handleSaveDraft}
        >
          Save Draft
        </Button>
        <Button
          style={{
            width: "150px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={handleSubmitDraft}
        >
          Submit as File
        </Button>
      </Box>
    </Card>
  );
}
