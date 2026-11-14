import React from "react";
import { Box, Button, Spinner, Text } from "zmp-ui";

export function LoadingState({ label = "Đang tải thực đơn..." }: { label?: string }) {
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex flex-col items-center justify-center py-12 px-4 gap-3"
    >
      <Spinner visible />
      <Text size="small" className="text-gray-600">
        {label}
      </Text>
    </Box>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Box
      role="alert"
      className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center"
    >
      <Text.Title size="small" className="text-red-700">
        Không thể tải dữ liệu
      </Text.Title>
      <Text size="small" className="text-gray-600">
        {message}
      </Text>
      <Button size="small" variant="secondary" onClick={onRetry}>
        Thử lại
      </Button>
    </Box>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Box
      role="status"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <Text size="normal" className="text-gray-600">
        {message}
      </Text>
    </Box>
  );
}
