import { useState, useEffect } from "react";
import {
  Card,
  Textarea,
  Button,
  Title,
  Group,
  Select,
  Box,
  Divider,
  Grid,
  Autocomplete,
  FileInput,
  Modal,
  Text,
  Flex,
  Paper,
  Timeline,
  Badge,
  ScrollArea,
  ActionIcon,
  Collapse,
  Avatar,
  Tooltip,
  Skeleton,
  useMantineTheme,
  SegmentedControl,
  Table,
  Center,
} from "@mantine/core";
import PropTypes from "prop-types";
import { notifications } from "@mantine/notifications";
import axios from "axios";
import {
  ArrowLeft,
  DownloadSimple,
  PaperPlaneTilt,
  Trash,
  Upload,
  CalendarBlank,
  User,
  UserCircle,
  CaretDown,
  CaretUp,
  File as FileIcon,
  Info,
  ArrowsClockwise,
  ChatCircleText,
  ChatCenteredText,
  ClockCounterClockwise,
  Table as TableIcon,
  ListBullets,
} from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mantine/hooks";
import {
  newFileDetailRoute,
  designationsRoute,
  getUsernameRoute,
  newHistoryRoute,
  newApproveRoute,
  newForwardRoute,
  newAmendRoute,
  newReturnRoute,
  newCloseRoute,
} from "../../../routes/filetrackingRoutes";
import { host } from "../../../routes/globalRoutes";
import { getApiErrorMessage } from "../utils/apiErrors";

export default function ViewFile({
  onBack,
  fileID,
  updateFiles,
  isArchived = false,
  contextSource = "",
}) {
  // State management
  const [file, setFile] = useState({});
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [receiver_username, setReceiverUsername] = useState("");
  const [receiver_designation, setReceiverDesignation] = useState("");
  const [receiver_designations, setReceiverDesignations] = useState([]);
  const [current_receiver, setCurrentReceiver] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [files, setFiles] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [opened, setOpened] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState("");
  const token = localStorage.getItem("authToken");
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedForwardFile, setSelectedForwardFile] = useState(null);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [amendAction, setAmendAction] = useState("SAVE");
  const [amendComment, setAmendComment] = useState("");
  const [amendFiles, setAmendFiles] = useState(null);
  const [amendReceiverUsername, setAmendReceiverUsername] = useState("");
  const [amendReceiverDesignation, setAmendReceiverDesignation] = useState("");
  const [amendReceiverDesignations, setAmendReceiverDesignations] = useState([]);
  const [amendUsernameSuggestions, setAmendUsernameSuggestions] = useState([]);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [returnRemarks, setReturnRemarks] = useState("");
  const [closeRemarks, setCloseRemarks] = useState("");
  const [isAmending, setIsAmending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [fileContent, setFileContent] = useState([]);
  const [remarksOpened, setRemarksOpened] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [descOpened, setDescOpened] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(true);
  // New state for view type
  const [viewType, setViewType] = useState("table");

  // Theme and responsive design
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  // eslint-disable-next-line no-unused-vars
  const isTablet = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);

  const downloadAttachment = (url) => {
    window.open(`${host}${url}`, "_blank");
  };

  const previewRemarks = fileContent
    .slice(0, 3)
    .map((line) => `• ${line}`)
    .join("\n");
  const allRemarks = fileContent.map((line) => `• ${line}`).join("\n");

  const getFileCreatedDate = (fileObj) => fileObj?.upload_date || fileObj?.created_at;

  const getFileCreatorLabel = (fileObj) => {
    if (!fileObj) return "Not available";
    if (fileObj.uploader || fileObj.uploader_designation) {
      const uploaderName = (fileObj.uploader || "").toString().trim();
      const uploaderDesig = (fileObj.uploader_designation || "").toString().trim();
      if (uploaderName && uploaderDesig) return `${uploaderName} [${uploaderDesig}]`;
      if (uploaderName) return uploaderName;
      if (uploaderDesig) return `[${uploaderDesig}]`;
    }
    if (fileObj.created_by) {
      const createdBy =
        typeof fileObj.created_by === "string"
          ? fileObj.created_by
          : fileObj.created_by?.username || "";
      const createdDesig = fileObj.created_by?.designation || "";
      return createdDesig ? `${createdBy} [${createdDesig}]` : createdBy || "Not available";
    }
    return "Not available";
  };

  const getTrackDate = (track) => track?.forward_date || track?.timestamp;
  const getTrackSender = (track) => track?.current_id || track?.sender || "-";
  const getTrackSenderDesignation = (track) => track?.sender_designation || "";
  const getTrackReceiver = (track) => track?.receiver_id || track?.receiver || "-";
  const getTrackReceiverDesignation = (track) => track?.receive_design || track?.receiver_designation || "";
  const formatUserWithDesignation = (name, designation) => {
    if (!designation) return name || "-";
    return `${name || "-"}[${designation}]`;
  };

  const getTrackAttachment = (track) => {
    if (track?.upload_file) return track.upload_file;
    if (Array.isArray(file?.attachments) && file.attachments.length > 0) {
      const firstAttachment = file.attachments[0];
      if (typeof firstAttachment === "string") return firstAttachment;
      return firstAttachment?.document || firstAttachment?.url || firstAttachment?.file || null;
    }
    return file?.upload_file || null;
  };

  // Generate file ID from file object
  const generateFileId = (fileObj) => {
    const createdDate = getFileCreatedDate(fileObj);
    if (!fileObj || !createdDate) return "Loading...";
    return `${fileObj.branch || "FTS"}-${new Date(createdDate).getFullYear()}-${(
      new Date(createdDate).getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-#${fileObj.id}`;
  };

  const receiverRoles = Array.isArray(receiver_designations)
    ? [...new Set(receiver_designations.filter(Boolean))].map((role) => ({
      value: role,
      label: role,
    }))
    : [];

  const amendReceiverRoles = Array.isArray(amendReceiverDesignations)
    ? [...new Set(amendReceiverDesignations.filter(Boolean))].map((role) => ({
      value: role,
      label: role,
    }))
    : [];

  useEffect(() => {
    setReceiverDesignation("");
    setReceiverDesignations([]);
  }, [receiver_username]);

  useEffect(() => {
    if (receiver_username && receiver_username.trim().length >= 2) {
      fetchRoles();
      return;
    }

    setReceiverDesignations([]);
    setReceiverDesignation("");
  }, [receiver_username]);

  useEffect(() => {
    setAmendReceiverDesignation("");
    setAmendReceiverDesignations([]);
  }, [amendReceiverUsername]);

  useEffect(() => {
    if (amendReceiverUsername && amendReceiverUsername.trim().length >= 2) {
      fetchAmendRoles();
      return;
    }

    setAmendReceiverDesignations([]);
    setAmendReceiverDesignation("");
  }, [amendReceiverUsername]);

  const currentUser = useSelector((state) => state.user.roll_no);
  const currentUsername = useSelector((state) => state.user.username);
  const currentLoginUsername = useSelector((state) => state.user.loginUsername);
  const userDesignation = useSelector((state) => state.user.role);

  const normalizeIdentity = (value) => {
    if (!value) return "";

    if (typeof value === "object") {
      return normalizeIdentity(
        value.username || value.user?.username || value.roll_no || value.id || "",
      );
    }

    return value.toString().trim().toLowerCase();
  };

  const currentIdentitySet = new Set([
    normalizeIdentity(currentUser),
    normalizeIdentity(currentUsername),
    normalizeIdentity(currentLoginUsername),
  ].filter(Boolean));

  const matchesCurrentUser = (value) => currentIdentitySet.has(normalizeIdentity(value));

  const getStatusBadge = () => {
    const status = (file?.status || "").toString().toUpperCase();

    switch (status) {
      case "ARCHIVED":
        return { color: "orange", label: "Archived" };
      case "CLOSED":
        return { color: "gray", label: "Closed" };
      case "APPROVED":
        return { color: "teal", label: "Approved" };
      case "REJECTED":
        return { color: "red", label: "Rejected" };
      case "FORWARDED":
        return { color: "blue", label: "In Progress" };
      case "PENDING":
        return { color: "yellow", label: "Pending" };
      case "SUBMITTED":
        return { color: "yellow", label: "Pending" };
      case "IN_PROGRESS":
        return { color: "blue", label: "In Progress" };
      case "CREATED":
        return { color: "violet", label: "Created" };
      default:
        return {
          color: isArchived ? "orange" : "blue",
          label: isArchived ? "Archived" : status ? status.replaceAll("_", " ") : "In Progress",
        };
    }
  };

  const getCreatorUsername = (fileObj) => {
    if (!fileObj) return "";
    if (typeof fileObj.created_by === "string") return fileObj.created_by;
    return fileObj.created_by?.username || fileObj.uploader || "";
  };

  // Helper function to format dates
  const convertDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  const removeFile = () => {
    setFiles(null);
  };

  const handleOpenRemarksModal = (x) => {
    setSelectedRemarks(x);
    setOpened(true);
  };
  const fetchData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      // Fetch file first
      const fileResponse = await axios.get(`${newFileDetailRoute(fileID)}`, {
        withCredentials: true,
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      setFile(fileResponse.data);
      setSelectedForwardFile(fileResponse.data);

      // Fetch history after file is fetched
      const historyResponse = await axios.get(`${newHistoryRoute(fileID)}`, {
        withCredentials: true,
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      const rawHistory = historyResponse.data;
      const trackingData = Array.isArray(rawHistory)
        ? rawHistory
        : Array.isArray(rawHistory?.movements)
          ? rawHistory.movements
          : [];

      const contentArray = trackingData.map(
        (track) =>
          `On ${convertDate(getTrackDate(track))}: ${formatUserWithDesignation(getTrackReceiver(track), getTrackReceiverDesignation(track))} action ${track?.action || ""} remarks: ${track?.remarks || ""}`,
      );

      if (trackingData.length > 0) {
        trackingData[0].upload_file = fileResponse.data.upload_file;
      }
      setTrackingHistory(trackingData);
      setCurrentReceiver(
        getTrackReceiver(trackingData[trackingData.length - 1]) ?? null,
      );
      setFileContent(contentArray);
    } catch (err) {
      console.error("Error fetching data:", err);
      const message = getApiErrorMessage(err, "Failed to load file data. Please try again.");
      setLoadError(message);
      notifications.show({
        title: "Could not load file",
        message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fileID, token]);

  useEffect(() => {
    let isMounted = true;
    const getUsernameSuggestion = async () => {
      try {
        const response = await axios.post(
          `${getUsernameRoute}`,
          {
            value: receiver_username,
            file_id: fileID,
          },
          {
            headers: { Authorization: `Token ${token}` },
          },
        );
        const users = JSON.parse(response.data.users);
        // Ensure response.data.users is an array before mapping
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
      isMounted = false; // Cleanup to prevent memory leaks
    };
  }, [receiver_username, token, fileID]);

  useEffect(() => {
    let isMounted = true;
    const getAmendUsernameSuggestion = async () => {
      try {
        const response = await axios.post(
          `${getUsernameRoute}`,
          {
            value: amendReceiverUsername,
            file_id: fileID,
          },
          {
            headers: { Authorization: `Token ${token}` },
          },
        );
        const users = JSON.parse(response.data.users);
        if (response.data && Array.isArray(users)) {
          const suggestedUsernames = users.map((user) => user.fields.username);
          if (isMounted) {
            setAmendUsernameSuggestions(suggestedUsernames);
          }
        }
      } catch (error) {
        console.error("Error fetching amend username suggestion:", error);
      }
    };

    if (amendReceiverUsername) {
      getAmendUsernameSuggestion();
    }

    return () => {
      isMounted = false;
    };
  }, [amendReceiverUsername, token, fileID]);

  // Fetch designations when a user is selected
  const fetchRoles = async () => {
    if (!receiver_username || receiver_username === "") return "";
    try {
      const response = await axios.get(
        `${designationsRoute}${receiver_username}`,
        {
          params: { file_id: fileID },
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      const nextDesignations = [...new Set([...(response.data.designations || [])].filter(Boolean))];
      setReceiverDesignations(nextDesignations);

      // Auto-fill designation for smoother forwarding UX.
      if (nextDesignations.length === 1) {
        setReceiverDesignation(nextDesignations[0]);
      } else if (!nextDesignations.includes(receiver_designation)) {
        setReceiverDesignation("");
      }
    } catch (err) {
      if (err.response && err.response.status === 500) {
        console.warn("Retrying fetchRoles in 2 seconds...");
      }
    }
  };

  const fetchAmendRoles = async () => {
    if (!amendReceiverUsername || amendReceiverUsername === "") return "";
    try {
      const response = await axios.get(
        `${designationsRoute}${amendReceiverUsername}`,
        {
          params: { file_id: fileID },
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      const nextDesignations = [...new Set([...(response.data.designations || [])].filter(Boolean))];
      setAmendReceiverDesignations(nextDesignations);

      if (nextDesignations.length === 1) {
        setAmendReceiverDesignation(nextDesignations[0]);
      } else if (!nextDesignations.includes(amendReceiverDesignation)) {
        setAmendReceiverDesignation("");
      }
    } catch (err) {
      if (err.response && err.response.status === 500) {
        console.warn("Retrying fetchAmendRoles in 2 seconds...");
      }
    }
  };

  // Validate files for supported types and size
  const validateAttachments = (fileList) => {
    if (!fileList) return { valid: [], invalid: [] };

    const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
    const MAX_SIZE_MB = 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const valid = [];
    const invalid = [];

    const filesArray = Array.isArray(fileList) ? fileList : [fileList];

    filesArray.forEach((file) => {
      const fileName = file.name || '';
      const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      const fileSize = file.size || 0;

      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        invalid.push({
          file: fileName,
          reason: `Unsupported attachment type: ${fileName}. Allowed: PDF, JPG, JPEG, PNG`,
        });
      } else if (fileSize > MAX_SIZE_BYTES) {
        invalid.push({
          file: fileName,
          reason: `Attachment too large: ${fileName}. Max size is ${MAX_SIZE_MB}MB`,
        });
      } else {
        valid.push(file);
      }
    });

    return { valid, invalid };
  };

  const handleFileChange = (data) => {
    const { valid, invalid } = validateAttachments(data);

    if (invalid.length > 0) {
      invalid.forEach((error) => {
        notifications.show({
          title: "Invalid file",
          message: error.reason,
          color: "red",
          position: "top-center",
          autoClose: 4000,
        });
      });
    }

    // Only set valid files
    setFiles(valid.length > 0 ? valid : null);
  };

  const handleAmendFileChange = (data) => {
    const { valid, invalid } = validateAttachments(data);

    if (invalid.length > 0) {
      invalid.forEach((error) => {
        notifications.show({
          title: "Invalid file",
          message: error.reason,
          color: "red",
          position: "top-center",
          autoClose: 4000,
        });
      });
    }

    // Only set valid files
    setAmendFiles(valid.length > 0 ? valid : null);
  };

  // Handle file forwarding
  const handleForward = async () => {
    if (!receiver_username || !receiver_designation) {
      notifications.show({
        title: "Missing information",
        message: "Please select both receiver and designation",
        color: "red",
        position: "top-center",
      });
      return;
    }

    setIsForwarding(true);
    try {
      const formData = new FormData();
      if (Array.isArray(files) && files.length > 0) {
        files.forEach((fileItem, index) => {
          const fileAttachment =
            fileItem instanceof File
              ? fileItem
              : new File([fileItem], `uploaded_file_${index}`, {
                type: "application/octet-stream",
              });
          formData.append("files", fileAttachment); // Append each file
        });
      } else if (files instanceof File) {
        formData.append("files", files);
      }
      formData.append("receiver", receiver_username);
      formData.append("receiver_designation", receiver_designation);
      formData.append("remarks", remarks);
      formData.append("receiver_department_id", "");
      const response = await axios.post(
        `${newForwardRoute(fileID)}`,
        formData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (response.status === 200 || response.status === 201) {
        notifications.show({
          title: "File forwarded successfully",
          message: "The file has been forwarded successfully.",
          color: "green",
          position: "top-center",
        });
        setIsForwarding(false);
        setShowForwardModal(false);
        setSelectedForwardFile(null);
        setReceiverDesignation("");
        setReceiverUsername("");
        setRemarks("");
        setFiles(null);
        updateFiles();
        onBack();
      }
    } catch (err) {
      console.error("Error forwarding file:", err);
      notifications.show({
        title: "Forward failed",
        message: getApiErrorMessage(err, "Failed to forward file. Please try again."),
        color: "red",
        position: "top-center",
      });
      setIsForwarding(false);
    }
  };

  const handleAmend = async () => {
    const hasComment = amendComment && amendComment.trim().length > 0;
    const hasAttachments = Array.isArray(amendFiles) ? amendFiles.length > 0 : amendFiles instanceof File;

    if (!hasComment && !hasAttachments) {
      notifications.show({
        title: "Amendment required",
        message: "Add a comment or attach at least one file.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    if (amendAction === "FORWARD" && (!amendReceiverUsername || !amendReceiverDesignation)) {
      notifications.show({
        title: "Forwarding details required",
        message: "Select receiver username and designation for amend and forward.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    setIsAmending(true);
    try {
      const formData = new FormData();
      formData.append("action", amendAction);
      if (hasComment) {
        formData.append("comment", amendComment.trim());
      }
      if (Array.isArray(amendFiles) && amendFiles.length > 0) {
        amendFiles.forEach((fileItem) => {
          formData.append("files", fileItem);
        });
      } else if (amendFiles instanceof File) {
        formData.append("files", amendFiles);
      }
      if (amendAction === "FORWARD") {
        formData.append("receiver", amendReceiverUsername);
        formData.append("receiver_designation", amendReceiverDesignation);
      }

      await axios.post(
        `${newAmendRoute(fileID)}`,
        formData,
        {
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      notifications.show({
        title: amendAction === "FORWARD" ? "Amended and forwarded" : "Amendment saved",
        message: amendAction === "FORWARD"
          ? "Your amendment was saved and the file was forwarded."
          : "Your amendment has been saved to file history.",
        color: "green",
        position: "top-center",
      });
      setShowAmendModal(false);
      setAmendAction("SAVE");
      setAmendComment("");
      setAmendFiles(null);
      setAmendReceiverUsername("");
      setAmendReceiverDesignation("");
      setAmendReceiverDesignations([]);
      fetchData();
      updateFiles();
      if (amendAction === "FORWARD") {
        onBack();
      }
    } catch (err) {
      notifications.show({
        title: "Amend failed",
        message: getApiErrorMessage(err, "Could not amend file."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsAmending(false);
    }
  };

  const handleReturn = async () => {
    if (!returnRemarks || returnRemarks.trim().length < 5) {
      notifications.show({
        title: "Remarks required",
        message: "Return remarks must be at least 5 characters.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    setIsReturning(true);
    try {
      await axios.post(
        `${newReturnRoute(fileID)}`,
        { remarks: returnRemarks.trim() },
        {
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      notifications.show({
        title: "Returned successfully",
        message: "The file has been returned to originator.",
        color: "green",
        position: "top-center",
      });
      setShowReturnModal(false);
      setReturnRemarks("");
      fetchData();
      updateFiles();
      onBack();
    } catch (err) {
      notifications.show({
        title: "Return failed",
        message: getApiErrorMessage(err, "Could not return file."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsReturning(false);
    }
  };

  const handleApprove = async () => {
    if (!approveRemarks || approveRemarks.trim().length < 5) {
      notifications.show({
        title: "Remarks required",
        message: "Approval remarks must be at least 5 characters.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    setIsApproving(true);
    try {
      await axios.post(
        `${newApproveRoute(fileID)}`,
        { remarks: approveRemarks.trim() },
        {
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      notifications.show({
        title: "Approved successfully",
        message: "The file has been approved.",
        color: "green",
        position: "top-center",
      });
      setShowApproveModal(false);
      setApproveRemarks("");
      fetchData();
      updateFiles();
      onBack();
    } catch (err) {
      notifications.show({
        title: "Approve failed",
        message: getApiErrorMessage(err, "Could not approve file."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCloseFile = async () => {
    if (!closeRemarks || closeRemarks.trim().length < 5) {
      notifications.show({
        title: "Remarks required",
        message: "Closure remarks must be at least 5 characters.",
        color: "red",
        position: "top-center",
      });
      return;
    }

    setIsClosing(true);
    try {
      await axios.post(
        `${newCloseRoute(fileID)}`,
        { remarks: closeRemarks.trim() },
        {
          withCredentials: true,
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      notifications.show({
        title: "File closed",
        message: "File marked as closed. It can now be archived.",
        color: "green",
        position: "top-center",
      });
      setShowCloseModal(false);
      setCloseRemarks("");
      fetchData();
      updateFiles();
    } catch (err) {
      notifications.show({
        title: "Close failed",
        message: getApiErrorMessage(err, "Could not close file."),
        color: "red",
        position: "top-center",
      });
    } finally {
      setIsClosing(false);
    }
  };

  // Render timeline view for all device sizes
  const renderTimelineView = () => {
    const bulletSize = isMobile ? 24 : 28;
    const lineWidth = isMobile ? 2 : 3;

    return (
      <ScrollArea
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontSize: "12px",
          minWidth: "700px",
        }}
      >
        <Timeline
          active={trackingHistory.length - 1}
          bulletSize={bulletSize}
          lineWidth={lineWidth}
          sx={{
            padding: isMobile ? "0.5rem" : "1rem",
            "& .mantine-Timeline-item": {
              marginBottom: isMobile ? "1rem" : "1.5rem",
            },
          }}
        >
          {trackingHistory.map((track, index) => (
            <Timeline.Item
              key={index}
              bullet={
                <Avatar
                  radius="xl"
                  size={bulletSize}
                  color={index === trackingHistory.length - 1 ? "blue" : "gray"}
                >
                  <ArrowsClockwise size={bulletSize / 2} />
                </Avatar>
              }
              title={
                <Group spacing="xs" align="center" wrap="nowrap">
                  <Text weight={600} size={isMobile ? "sm" : "md"}>
                    {track.current_id}
                  </Text>
                  <Badge
                    size={isMobile ? "sm" : "md"}
                    color="blue"
                    variant="light"
                  >
                    {getTrackSenderDesignation(track)}
                  </Badge>
                </Group>
              }
            >
              <Text
                color="dimmed"
                size={isMobile ? "xs" : "sm"}
                mb={isMobile ? 5 : 8}
              >
                {convertDate(getTrackDate(track))}
              </Text>

              <Paper
                p="xs"
                withBorder
                mb={10}
                style={{ background: "#f8f9fa" }}
              >
                <Group mb={5}>
                  <Text weight={500} size={isMobile ? "xs" : "sm"}>
                    To:
                  </Text>
                  <Text size={isMobile ? "xs" : "sm"}>
                    <Text span weight={500}>
                      {getTrackReceiver(track)}
                    </Text>{" "}
                    {getTrackReceiverDesignation(track)
                      ? `[${getTrackReceiverDesignation(track)}]`
                      : ""}
                  </Text>
                </Group>

                {track.remarks && (
                  <Box mt={8}>
                    <Text weight={500} size={isMobile ? "xs" : "sm"} mb={5}>
                      Remarks:
                    </Text>
                    <Paper
                      p="xs"
                      withBorder
                      style={{
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        borderLeft: "3px solid #228be6",
                      }}
                      onClick={() => handleOpenRemarksModal(track.remarks)}
                    >
                      <Text size={isMobile ? "xs" : "sm"} lineClamp={2}>
                        {track.remarks}
                      </Text>
                      {track.remarks.length > 100 && (
                        <Text size="xs" color="blue" mt={3}>
                          Click to read more
                        </Text>
                      )}
                    </Paper>
                  </Box>
                )}
              </Paper>

              {getTrackAttachment(track) && (
                <Button
                  variant="light"
                  size={isMobile ? "xs" : "sm"}
                  leftSection={<DownloadSimple size={isMobile ? 14 : 16} />}
                  onClick={() => downloadAttachment(getTrackAttachment(track))}
                  fullWidth={isMobile}
                  style={{ maxWidth: isMobile ? "100%" : "200px" }}
                >
                  Download Attachment
                </Button>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </ScrollArea>
    );
  };

  // Render tabular view (only for desktop)
  const renderTabularView = () => {
    return (
      <ScrollArea>
        <Table
          highlightOnHover
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            fontSize: "12px",
            minWidth: "700px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#0000" }}>
              <th
                style={{
                  padding: "8px",
                  width: "9%",
                  border: "1px solid #ddd",
                  textAlign: "center",
                }}
              >
                Date
              </th>
              <th
                style={{
                  padding: "8px",
                  width: "13%",
                  border: "1px solid #ddd",
                  textAlign: "center",
                }}
              >
                Sender
              </th>
              <th
                style={{
                  padding: "8px",
                  width: "13%",
                  border: "1px solid #ddd",
                  textAlign: "center",
                }}
              >
                Receiver
              </th>
              <th
                style={{
                  padding: "8px",
                  width: "20%",
                  border: "1px solid #ddd",
                  textAlign: "center",
                }}
              >
                Remarks
              </th>
              <th
                style={{
                  padding: "8px",
                  width: "10%",
                  border: "1px solid #ddd",
                  textAlign: "center",
                }}
              >
                Attachment
              </th>
            </tr>
          </thead>
          <tbody>
            {trackingHistory.map((track, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                    wordWrap: "break-word",
                  }}
                >
                  {convertDate(getTrackDate(track))}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                    wordWrap: "break-word",
                  }}
                >
                  {formatUserWithDesignation(getTrackSender(track), getTrackSenderDesignation(track))}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                    wordWrap: "break-word",
                  }}
                >
                  {formatUserWithDesignation(getTrackReceiver(track), getTrackReceiverDesignation(track))}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                    wordWrap: "break-word",
                    cursor: "pointer",
                  }}
                  onClick={() => handleOpenRemarksModal(track.remarks || "-")}
                >
                  {track.remarks && track.remarks.length > 15
                    ? `${track.remarks.slice(0, 15)}...`
                    : track.remarks || "-"}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #ddd",
                  }}
                >
                  {getTrackAttachment(track) ? (
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<DownloadSimple size={16} />}
                      onClick={() => downloadAttachment(getTrackAttachment(track))}
                      style={{
                        display: "inline-block",
                        padding: "5px 10px",
                        fontSize: "10px",
                      }}
                    >
                      Download
                    </Button>
                  ) : (
                    "No file found"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ScrollArea>
    );
  };

  const isCreator = matchesCurrentUser(getCreatorUsername(file));
  const isCurrentHolderByIdentity = matchesCurrentUser(file?.current_holder);
  const isCurrentHolderFromApi =
    typeof file?.is_current_handler === "boolean"
      ? file.is_current_handler
      : typeof file?.isCurrentHandler === "boolean"
        ? file.isCurrentHandler
        : null;
  const isCurrentHolder =
    isCurrentHolderFromApi !== null
      ? isCurrentHolderFromApi
      : isCurrentHolderByIdentity || contextSource === "inbox";
  const isActiveStatus = !["CLOSED", "ARCHIVED"].includes(file?.status);
  const isProcessingStatus = ["PENDING", "SUBMITTED", "IN_PROGRESS", "FORWARDED"].includes(file?.status);
  const isCreatedStatus = file?.status === "CREATED";

  const isViewOnlyFromApi =
    typeof file?.is_view_only === "boolean"
      ? file.is_view_only
      : typeof file?.isViewOnly === "boolean"
        ? file.isViewOnly
        : null;

  const canForwardFromApi =
    typeof file?.can_forward === "boolean"
      ? file.can_forward
      : typeof file?.canForward === "boolean"
        ? file.canForward
        : null;
  const canApproveFromApi =
    typeof file?.can_approve === "boolean"
      ? file.can_approve
      : typeof file?.canApprove === "boolean"
        ? file.canApprove
        : typeof file?.can_accept === "boolean"
          ? file.can_accept
          : typeof file?.canAccept === "boolean"
            ? file.canAccept
            : null;
  const canReturnFromApi =
    typeof file?.can_return === "boolean"
      ? file.can_return
      : typeof file?.canReturn === "boolean"
        ? file.canReturn
        : null;
  const canAmendFromApi =
    typeof file?.can_amend === "boolean"
      ? file.can_amend
      : typeof file?.canAmend === "boolean"
        ? file.canAmend
        : null;
  const canCloseFromApi =
    typeof file?.can_close === "boolean"
      ? file.can_close
      : typeof file?.canClose === "boolean"
        ? file.canClose
        : null;

  const canShowReceiverActions =
    !isArchived
    && isProcessingStatus
    && isCurrentHolder
    && (isViewOnlyFromApi !== true);
  const shouldShowApproveButton = canApproveFromApi === true || canShowReceiverActions;
  const shouldShowForwardButton = canForwardFromApi === true || canShowReceiverActions;
  const shouldShowReturnButton = canReturnFromApi === true || canShowReceiverActions;
  const canAmendFile = canAmendFromApi === true || canShowReceiverActions;

  // Close remains creator-only.
  const canCloseFile = canCloseFromApi ?? (!isArchived && isCreator && isActiveStatus && !isCreatedStatus);

  return (
    <Card
      shadow="sm"
      padding={isMobile ? "md" : "lg"}
      radius="md"
      withBorder
      style={{
        backgroundColor: "#FFFFFF",
        minHeight: "10vh",
        padding: isMobile ? "1rem" : "2rem",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 170px)",
        overflow: "hidden",
      }}
    >
      {/* File Details: ViewFile */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        <div>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              backgroundColor: "#FFFFFF",
              padding: "10px 0",
              borderBottom: "1px solid #E0E6ED",
            }}
          >
            <Flex align="center" justify="center" mb="lg">
              <div style={{ position: "absolute", left: 0 }}>
                <Tooltip label="Go back" position="right">
                  <Button variant="subtle" onClick={onBack} radius="xl">
                    <ArrowLeft size={20} />
                  </Button>
                </Tooltip>
              </div>
              <Title
                order={3}
                style={{
                  fontSize: isMobile ? "20px" : "26px",
                  textAlign: "center",
                }}
              >
                {loading ? (
                  <Skeleton height={30} width="80%" radius="xl" />
                ) : (
                  generateFileId(file)
                )}
              </Title>
            </Flex>
          </div>

          <Divider mb="lg" />

          {/* Action Buttons */}
          <Group
            position="center"
            mb="lg"
            spacing={isMobile ? "md" : "xl"}
            style={{ flexWrap: "wrap" }}
          >
            {shouldShowForwardButton && (
              <Button
                leftSection={<PaperPlaneTilt size={20} />}
                onClick={() => {
                  setSelectedForwardFile(file);
                  setShowForwardModal(true);
                }}
                disabled={loading}
                color="blue"
                radius="md"
                fullWidth={isMobile}
              >
                Forward
              </Button>
            )}

            {shouldShowReturnButton && (
              <Button
                leftSection={<ArrowLeft size={20} />}
                onClick={() => setShowReturnModal(true)}
                disabled={loading}
                color="orange"
                radius="md"
                fullWidth={isMobile}
              >
                Return
              </Button>
            )}

            {shouldShowApproveButton && (
              <Button
                leftSection={<ArrowsClockwise size={20} />}
                onClick={() => setShowApproveModal(true)}
                disabled={loading}
                color="teal"
                radius="md"
                fullWidth={isMobile}
              >
                Accept
              </Button>
            )}

            {canAmendFile && (
              <Button
                leftSection={<ChatCircleText size={20} />}
                onClick={() => setShowAmendModal(true)}
                disabled={loading}
                color="teal"
                radius="md"
                fullWidth={isMobile}
              >
                Amend
              </Button>
            )}

            {canCloseFile && (
              <Button
                leftSection={<FileIcon size={20} />}
                onClick={() => setShowCloseModal(true)}
                disabled={loading}
                color="grape"
                radius="md"
                fullWidth={isMobile}
              >
                Close File
              </Button>
            )}

            {file?.upload_file && (
              <Button
                leftSection={<DownloadSimple size={20} />}
                onClick={() => {
                  trackingHistory.forEach((track) => {
                    if (track.upload_file) {
                      downloadAttachment(track.upload_file);
                    }
                  });
                }}
                variant="outline"
                radius="md"
                fullWidth={isMobile}
              >
                Download All Attachments
              </Button>
            )}
          </Group>

          {!loading && loadError && (
            <Paper p="md" withBorder mb="lg" style={{ backgroundColor: "#fff5f5", borderColor: "#ffa8a8" }}>
              <Group position="apart">
                <Text c="red" size="sm">{loadError}</Text>
                <Button size="xs" variant="outline" color="red" onClick={fetchData}>
                  Retry
                </Button>
              </Group>
            </Paper>
          )}

          {/* File Summary Card */}
          <Paper
            p="md"
            shadow="xs"
            radius="md"
            withBorder
            style={{
              marginBottom: "1.5rem",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Flex justify="space-between" align="center" mb="xs" wrap="nowrap">
              {/* Left section: File icon + subject + ID */}
              <Group spacing="xs" wrap="nowrap">
                <Avatar color="blue" radius="xl">
                  <FileIcon size={20} />
                </Avatar>
                <Box>
                  {loading ? (
                    <>
                      <Skeleton height={20} width={150} />
                      <Skeleton height={16} width={100} mt={6} />
                    </>
                  ) : (
                    <>
                      <Text weight={700} size={isMobile ? "md" : "lg"}>
                        {file.subject}
                      </Text>
                      <Text size="sm" color="dimmed">
                        {generateFileId(file)}
                      </Text>
                    </>
                  )}
                </Box>
              </Group>

              {/* Right section: Status badge */}
              {!loading && (
                (() => {
                  const { color, label } = getStatusBadge();
                  return (
                    <Badge
                      color={color}
                      size="lg"
                      variant="filled"
                      radius="sm"
                    >
                      {label}
                    </Badge>
                  );
                })()
              )}
            </Flex>

            <Grid mt="md" gutter="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Group spacing="xs" align="center" wrap="nowrap">
                  <CalendarBlank size={18} />
                  <Text weight={500}>Upload Date:</Text>
                  {loading ? (
                    <Skeleton height={16} width={120} />
                  ) : (
                    <Text>
                      {file?.upload_date
                        ? convertDate(file.upload_date)
                        : file?.created_at
                          ? convertDate(file.created_at)
                          : "Not available"}
                    </Text>
                  )}
                </Group>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Group spacing="xs" align="center" wrap="nowrap">
                  <UserCircle size={18} />
                  <Text weight={500}>Created By:</Text>
                  {loading ? (
                    <Skeleton height={16} width={120} />
                  ) : (
                    <Text>
                      {getFileCreatorLabel(file)}
                    </Text>
                  )}
                </Group>
              </Grid.Col>
            </Grid>

            <Divider my="md" />
            <Box>
              <Group position="apart" mb="xs">
                <Text weight={500} size="sm">
                  <Info
                    size={16}
                    style={{ marginRight: "5px", verticalAlign: "text-bottom" }}
                  />
                  Description
                </Text>
                <Tooltip label="View full description">
                  <ActionIcon
                    onClick={() => setDescOpened(true)}
                    size="sm"
                    radius="xl"
                    variant="light"
                    color="blue"
                  >
                    <Info size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              {loading ? (
                <>
                  <Skeleton height={12} width="90%" radius="xl" mb={8} />
                  <Skeleton height={12} width="85%" radius="xl" mb={8} />
                  <Skeleton height={12} width="80%" radius="xl" />
                </>
              ) : (
                <Paper
                  p="xs"
                  withBorder
                  style={{ backgroundColor: "#fff", cursor: "pointer" }}
                  onClick={() => setDescOpened(true)}
                >
                  <Text
                    size="sm"
                    style={{ whiteSpace: "pre-wrap" }}
                    lineClamp={3}
                  >
                    {file.description}
                  </Text>
                  {file.description.length > 300 && (
                    <Text
                      size="xs"
                      c="blue"
                      mt={5}
                      onClick={() => setDescOpened(true)}
                    >
                      Click to view full description
                    </Text>
                  )}
                </Paper>
              )}
            </Box>
            <Divider my="md" />
            <Box>
              <Group position="apart" mb="xs">
                <Text weight={500} size="sm">
                  <ChatCircleText
                    size={16}
                    style={{ marginRight: "5px", verticalAlign: "text-bottom" }}
                  />
                  File Comments
                </Text>
                <Tooltip label="View all comments">
                  <ActionIcon
                    onClick={() => setRemarksOpened(true)}
                    size="sm"
                    radius="xl"
                    variant="light"
                    color="blue"
                  >
                    <Info size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              {loading ? (
                <>
                  <Skeleton height={12} width="90%" radius="xl" mb={8} />
                  <Skeleton height={12} width="80%" radius="xl" mb={8} />
                  <Skeleton height={12} width="85%" radius="xl" />
                </>
              ) : (
                <Paper
                  p="xs"
                  withBorder
                  style={{ backgroundColor: "#fff", cursor: "pointer" }}
                  onClick={() => setRemarksOpened(true)}
                >
                  <Text
                    size="sm"
                    style={{ whiteSpace: "pre-wrap" }}
                    lineClamp={3}
                  >
                    {previewRemarks}
                  </Text>
                  {fileContent.length > 3 && (
                    <Text size="xs" c="blue" mt={5}>
                      Click to view all {fileContent.length} comments
                    </Text>
                  )}
                </Paper>
              )}
            </Box>
          </Paper>
        </div>

        {/* Tracking History of the File */}
        <Paper shadow="xs" radius="md" p={0} withBorder mb="lg">
          <Flex
            p="md"
            justify="space-between"
            align="center"
            style={{
              backgroundColor: "#f1f3f5",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              borderBottom: historyExpanded ? "1px solid #dee2e6" : "none",
            }}
            onClick={() => setHistoryExpanded(!historyExpanded)}
            sx={{ cursor: "pointer" }}
          >
            <Group>
              <ClockCounterClockwise size={20} />
              <Title
                order={4}
                style={{ margin: 0, fontSize: isMobile ? "16px" : "18px" }}
              >
                Tracking History of {file?.subject || generateFileId(file)}
              </Title>
            </Group>
            <Group>
              {/* View Type Selector - Only show on desktop */}
              {!isMobile && historyExpanded && (
                <SegmentedControl
                  value={viewType}
                  onChange={setViewType}
                  data={[
                    {
                      value: "table",
                      label: (
                        <Center>
                          <TableIcon size={16} style={{ marginRight: 8 }} />
                          <Text size="sm">Table</Text>
                        </Center>
                      ),
                    },
                    {
                      value: "timeline",
                      label: (
                        <Center>
                          <ListBullets size={16} style={{ marginRight: 8 }} />
                          <Text size="sm">Timeline</Text>
                        </Center>
                      ),
                    },
                  ]}
                  size="xs"
                  radius="md"
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginRight: 10 }}
                />
              )}
              <ActionIcon variant="subtle">
                {historyExpanded ? (
                  <CaretUp size={16} />
                ) : (
                  <CaretDown size={16} />
                )}
              </ActionIcon>
            </Group>
          </Flex>

          <Collapse in={historyExpanded}>
            <Box p={isMobile ? "xs" : "md"}>
              {loading ? (
                <>
                  <Skeleton height={50} radius="sm" mb={10} />
                  <Skeleton height={50} radius="sm" mb={10} />
                  <Skeleton height={50} radius="sm" />
                </>
              ) : isMobile ? (
                // Mobile always shows timeline view
                renderTimelineView()
              ) : // Desktop shows selected view type
                viewType === "timeline" ? (
                  renderTimelineView()
                ) : (
                  renderTabularView()
                )}
            </Box>
          </Collapse>
        </Paper>

        {/* Modals */}

        {/* Description Modal */}
        <Modal
          opened={descOpened}
          onClose={() => setDescOpened(false)}
          title={
            <Text weight={600}>File Description - {generateFileId(file)}</Text>
          }
          size="lg"
        >
          <ScrollArea style={{ height: "60vh" }}>
            <Textarea
              value={file.description}
              readOnly
              autosize
              style={{
                backgroundColor: "#f8f9fa",
                padding: "10px",
                borderRadius: "8px",
              }}
            />
          </ScrollArea>
        </Modal>
        {/* Remarks Modal */}
        <Modal
          opened={remarksOpened}
          onClose={() => setRemarksOpened(false)}
          title={
            <Text weight={600}>Comments History - {generateFileId(file)}</Text>
          }
          size="lg"
        >
          <ScrollArea style={{ height: "60vh" }}>
            <Textarea
              value={allRemarks}
              readOnly
              autosize
              minRows={Math.max(fileContent.length, 3)}
              style={{
                backgroundColor: "#f8f9fa",
                padding: "10px",
                borderRadius: "8px",
              }}
            />
          </ScrollArea>
        </Modal>

        {/* Individual Remark Modal */}
        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={<Text weight={600}>Full Remarks</Text>}
          size="lg"
        >
          <Paper p="md" withBorder>
            <Text style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
              {selectedRemarks}
            </Text>
          </Paper>
        </Modal>

        {/* Forward Modal */}
        <Modal
          opened={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setSelectedForwardFile(null);
          }}
          title={<Text weight={600}>Forward File</Text>}
          centered
          size={isMobile ? "sm" : "lg"}
          scrollAreaComponent={ScrollArea}
        >
          <Paper p="md" withBorder mb="md" style={{ backgroundColor: "#f8f9fa" }}>
            <Grid>
              <Grid.Col span={5}>
                <Text weight={500}>File ID:</Text>
              </Grid.Col>
              <Grid.Col span={7}>
                <Text>{selectedForwardFile && generateFileId(selectedForwardFile)}</Text>
              </Grid.Col>

              <Grid.Col span={5}>
                <Text weight={500}>Subject:</Text>
              </Grid.Col>
              <Grid.Col span={7}>
                <Text>{selectedForwardFile?.subject}</Text>
              </Grid.Col>

              <Grid.Col span={5}>
                <Text weight={500}>Created By:</Text>
              </Grid.Col>
              <Grid.Col span={7}>
                <Text>{getFileCreatorLabel(selectedForwardFile || file)}</Text>
              </Grid.Col>
            </Grid>
          </Paper>

          <Grid gutter="md" mb="md" align="flex-end">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Autocomplete
                label="Forward To"
                placeholder="Enter recipient username"
                value={receiver_username}
                data={usernameSuggestions}
                onChange={(value) => {
                  setReceiverDesignation("");
                  setReceiverUsername(value);
                }}
                icon={<User size={16} />}
                required
                size="sm"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                key={receiver_username}
                label="Receiver Designation"
                placeholder={receiver_username ? "Select designation" : "Enter recipient username first"}
                value={receiver_designation}
                data={receiverRoles}
                onChange={(value) => setReceiverDesignation(value)}
                searchable
                nothingFoundMessage="No designations found"
                icon={<UserCircle size={16} />}
                required
                size="sm"
                disabled={!receiver_username || receiver_username.trim().length < 2}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Remarks"
            placeholder="Enter remarks (500 letters maximum)"
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
            c={remarks.split(/\s+/).length >= 45 ? "red" : "dimmed"}
          >
            {remarks.split(/\s+/).length} / 50 words
          </Text>

          {Array.isArray(file?.attachments) && file.attachments.length > 0 && (
            <Box mb="md">
              <Text weight={500} size="sm" mb="xs">
                📎 Current Attachments (will be forwarded):
              </Text>
              <Paper p="xs" withBorder style={{ backgroundColor: "#f0f4f9" }} radius="md">
                {file.attachments.map((attachment, idx) => (
                  <Group key={idx} position="apart" spacing="xs" mb={idx < file.attachments.length - 1 ? "xs" : 0}>
                    <Text size="sm" style={{ wordBreak: "break-word" }}>
                      {attachment.name || `Attachment ${idx + 1}`}
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<DownloadSimple size={14} />}
                      onClick={() => {
                        const url = attachment.document || attachment.url || attachment.file;
                        if (url) downloadAttachment(url);
                      }}
                    >
                      Download
                    </Button>
                  </Group>
                ))}
              </Paper>
              <Text size="xs" c="dimmed" mt="xs">
                ✓ These attachments will be retained when forwarding
              </Text>
            </Box>
          )}

          <FileInput
            label="Attach file (PDF, JPG, PNG) (MAX: 10MB) - OPTIONAL"
            placeholder="Upload file (optional - existing attachments will be kept)"
            accept="application/pdf,image/jpeg,image/png"
            icon={<Upload size={16} />}
            value={files}
            onChange={handleFileChange}
            mb="md"
            multiple
          />

          {files && files.length > 0 && (
            <Group position="left" mb="md">
              <Button
                leftSection={<Trash size={16} />}
                color="red"
                onClick={removeFile}
                size="sm"
                variant="light"
              >
                Remove File
              </Button>
            </Group>
          )}

          <Divider my="md" />

          <Group justify="center" gap="xl" style={{ width: "100%" }}>
            <Button
              onClick={handleForward}
              color="blue"
              loading={isForwarding}
              disabled={!receiver_designation || !receiver_username || !remarks}
              style={{ width: isMobile ? "100px" : "120px" }}
              radius="md"
            >
              Forward
            </Button>
            <Button
              onClick={() => {
                setShowForwardModal(false);
                setSelectedForwardFile(null);
              }}
              variant="outline"
              style={{ width: isMobile ? "100px" : "120px" }}
              radius="md"
            >
              Cancel
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={showAmendModal}
          onClose={() => {
            setShowAmendModal(false);
            setAmendAction("SAVE");
            setAmendComment("");
            setAmendFiles(null);
            setAmendReceiverUsername("");
            setAmendReceiverDesignation("");
            setAmendReceiverDesignations([]);
          }}
          title={<Text weight={600}>Amend File</Text>}
          centered
          size={isMobile ? "sm" : "md"}
        >
          <SegmentedControl
            mb="md"
            value={amendAction}
            onChange={setAmendAction}
            data={[
              { label: "Save Amendment", value: "SAVE" },
              { label: "Amend and Forward", value: "FORWARD" },
            ]}
            fullWidth
          />

          <Textarea
            label="Amendment Comment (Optional)"
            placeholder="Enter amendment comment"
            value={amendComment}
            minRows={4}
            onChange={(e) => setAmendComment(e.currentTarget.value)}
            mb="md"
          />

          {/* Existing Attachments for Amend */}
          {Array.isArray(file?.attachments) && file.attachments.length > 0 && (
            <Box mb="md">
              <Text weight={500} size="sm" mb="xs">
                📎 Current Attachments:
              </Text>
              <Paper p="xs" withBorder style={{ backgroundColor: "#f0f4f9" }} radius="md">
                {file.attachments.map((attachment, idx) => (
                  <Group key={idx} position="apart" spacing="xs" mb={idx < file.attachments.length - 1 ? "xs" : 0}>
                    <Text size="sm" style={{ wordBreak: "break-word" }}>
                      {attachment.name || `Attachment ${idx + 1}`}
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<DownloadSimple size={14} />}
                      onClick={() => {
                        const url = attachment.document || attachment.url || attachment.file;
                        if (url) downloadAttachment(url);
                      }}
                    >
                      Download
                    </Button>
                  </Group>
                ))}
              </Paper>
              <Text size="xs" c="dimmed" mt="xs">
                ✓ These attachments will be retained after amendment
              </Text>
            </Box>
          )}

          <FileInput
            label="Attachments (Optional)"
            placeholder="Upload files (optional - existing attachments will be kept)"
            accept="application/pdf,image/jpeg,image/png"
            icon={<Upload size={16} />}
            value={amendFiles}
            onChange={handleAmendFileChange}
            mb="md"
            multiple
          />

          {amendAction === "FORWARD" && (
            <>
              <Autocomplete
                label="Forward To"
                placeholder="Enter recipient username"
                value={amendReceiverUsername}
                data={amendUsernameSuggestions}
                onChange={(value) => {
                  setAmendReceiverDesignation("");
                  setAmendReceiverUsername(value);
                }}
                icon={<User size={16} />}
                mb="sm"
                required
              />
              <Select
                key={amendReceiverUsername}
                label="Receiver Designation"
                placeholder={amendReceiverUsername ? "Select designation" : "Enter recipient username first"}
                value={amendReceiverDesignation}
                data={amendReceiverRoles}
                onChange={(value) => setAmendReceiverDesignation(value || "")}
                searchable
                nothingFoundMessage="No designations found"
                icon={<UserCircle size={16} />}
                mb="md"
                required
                disabled={!amendReceiverUsername || amendReceiverUsername.trim().length < 2}
              />
            </>
          )}

          <Group justify="center" gap="xl" style={{ width: "100%" }}>
            <Button onClick={handleAmend} color="teal" loading={isAmending} radius="md">
              {amendAction === "FORWARD" ? "Amend and Forward" : "Save Amendment"}
            </Button>
            <Button
              onClick={() => {
                setShowAmendModal(false);
                setAmendAction("SAVE");
                setAmendComment("");
                setAmendFiles(null);
                setAmendReceiverUsername("");
                setAmendReceiverDesignation("");
                setAmendReceiverDesignations([]);
              }}
              variant="outline"
              radius="md"
            >
              Cancel
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title={<Text weight={600}>Approve File</Text>}
          centered
          size={isMobile ? "sm" : "md"}
        >
          <Textarea
            label="Approval Remarks"
            placeholder="Enter approval remarks"
            value={approveRemarks}
            minRows={4}
            onChange={(e) => setApproveRemarks(e.currentTarget.value)}
            mb="md"
            required
          />
          <Group justify="center" gap="xl" style={{ width: "100%" }}>
            <Button onClick={handleApprove} color="teal" loading={isApproving} radius="md">
              Confirm Approve
            </Button>
            <Button onClick={() => setShowApproveModal(false)} variant="outline" radius="md">
              Cancel
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          title={<Text weight={600}>Return File</Text>}
          centered
          size={isMobile ? "sm" : "md"}
        >
          <Textarea
            label="Return Remarks"
            placeholder="Enter return reason"
            value={returnRemarks}
            minRows={4}
            onChange={(e) => setReturnRemarks(e.currentTarget.value)}
            mb="md"
            required
          />
          <Group justify="center" gap="xl" style={{ width: "100%" }}>
            <Button onClick={handleReturn} color="orange" loading={isReturning} radius="md">
              Confirm Return
            </Button>
            <Button onClick={() => setShowReturnModal(false)} variant="outline" radius="md">
              Cancel
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          title={<Text weight={600}>Close File</Text>}
          centered
          size={isMobile ? "sm" : "md"}
        >
          <Textarea
            label="Closure Remarks"
            placeholder="Enter closure remarks"
            value={closeRemarks}
            minRows={4}
            onChange={(e) => setCloseRemarks(e.currentTarget.value)}
            mb="md"
            required
          />
          <Group justify="center" gap="xl" style={{ width: "100%" }}>
            <Button onClick={handleCloseFile} color="grape" loading={isClosing} radius="md">
              Confirm Close
            </Button>
            <Button onClick={() => setShowCloseModal(false)} variant="outline" radius="md">
              Cancel
            </Button>
          </Group>
        </Modal>
      </ScrollArea >
    </Card >
  );
}

ViewFile.propTypes = {
  onBack: PropTypes.func.isRequired,
  fileID: PropTypes.number.isRequired,
  updateFiles: PropTypes.func.isRequired,
  isArchived: PropTypes.bool,
  contextSource: PropTypes.string,
};
