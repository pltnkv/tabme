import React from "react"
import { TextInput, PasswordInput, Button, Text, Group, Stack } from "@mantine/core"
import { useForm } from "@mantine/form"
import { Modal } from "./Modal"

interface LoginModalProps {
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<void>
  loading?: boolean
}

export function LoginModal({ onClose, onLogin, loading = false }: LoginModalProps) {
  const form = useForm({
    initialValues: {
      email: "",
      password: ""
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (value.length < 1 ? "Password is required" : null)
    }
  })

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      await onLogin(values.email, values.password)
      form.reset()
      onClose()
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  return (
    <Modal onClose={onClose} style={{ maxWidth: "420px" }}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter your credentials to access beta features
          </Text>

          <TextInput
            autoFocus={true}
            label="Email"
            placeholder="your@email.com"
            required
            {...form.getInputProps("email")}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            {...form.getInputProps("password")}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
            >
              Login
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
} 