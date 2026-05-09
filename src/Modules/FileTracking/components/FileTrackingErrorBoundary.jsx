import React from "react";
import PropTypes from "prop-types";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";

class FileTrackingErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        // Keep crash details in console for developers while showing a safe UI to users.
        // eslint-disable-next-line no-console
        console.error("FileTracking UI crashed:", error);
    }

    reset = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <Alert color="red" title="Something went wrong in File Tracking" radius="md">
                <Stack spacing="sm">
                    <Text size="sm">Your unsent data is still in this page state. Try reloading this section.</Text>
                    <Group>
                        <Button size="xs" onClick={this.reset}>
                            Retry
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </Group>
                </Stack>
            </Alert>
        );
    }
}

FileTrackingErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
};

export default FileTrackingErrorBoundary;
