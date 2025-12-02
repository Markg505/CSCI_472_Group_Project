import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CustomerDashboard from "../CustomerDashboard";
import { vi } from "vitest";
import { apiClient } from "../../api/client";

const mockUpdateProfile = vi.fn().mockResolvedValue({
  userId: "user-1",
  fullName: "Updated User",
  email: "updated@example.com",
  phone: "555-0000",
  role: "customer",
});

const mockChangePassword = vi.fn().mockResolvedValue(undefined);

vi.mock("../../features/auth/useAuth", () => {
  return {
    useAuth: () => ({
      user: {
        userId: "user-1",
        fullName: "Test User",
        email: "test@example.com",
        phone: "111-1111",
        role: "customer",
      },
      updateProfile: mockUpdateProfile,
      changePassword: mockChangePassword,
      setUser: vi.fn(),
      loginWithCredentials: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

vi.mock("../../api/client", () => {
  const getOrderHistory = vi.fn(async (params) => ({
    items: [
      {
        orderId: "o1",
        total: 12.5,
        status: params.status || "paid",
        createdUtc: "2024-01-01T00:00:00Z",
        source: "web",
        subtotal: 10,
        tax: 2.5,
        userId: params.userId,
      },
    ],
    page: params.page || 1,
    pageSize: params.pageSize || 5,
    total: params.startUtc || params.endUtc ? 4 : 12,
    retentionMonths: 6,
    retentionHorizon: "2024-01-01",
  }));

  const getReservationHistory = vi.fn(async (params) => ({
    items: [
      {
        reservationId: "r1",
        tableId: "t1",
        partySize: 2,
        status: params.status || "confirmed",
        startUtc: "2024-01-02T00:00:00Z",
        endUtc: "2024-01-02T01:00:00Z",
        userId: params.userId,
      },
    ],
    page: params.page || 1,
    pageSize: params.pageSize || 5,
    total: params.startUtc || params.endUtc || params.status ? 2 : 6,
    retentionMonths: params.startUtc || params.endUtc || params.status ? 9 : 6,
    retentionHorizon: params.startUtc || params.endUtc || params.status ? "2023-11-01" : "2024-01-01",
  }));

  return { apiClient: { getOrderHistory, getReservationHistory } };
});

describe("CustomerDashboard", () => {
  const renderDashboard = () =>
    render(
      <MemoryRouter>
        <CustomerDashboard />
      </MemoryRouter>
    );

  it("saves profile updates through the auth client", async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByText(/My Dashboard/i)).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/Full Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated User");

    const emailInput = screen.getByLabelText(/Email/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "updated@example.com");

    const phoneInput = screen.getByLabelText(/Phone/i);
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, "555-0000");

    await userEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      fullName: "Updated User",
      email: "updated@example.com",
      phone: "555-0000",
    });
    expect(await screen.findByText(/Profile updated successfully/i)).toBeInTheDocument();
  });

  it("triggers history reloads when filters, dates, and pagination change", async () => {
    renderDashboard();

    await waitFor(() => expect((apiClient.getOrderHistory as any).mock.calls.length).toBeGreaterThan(0));

    expect(await screen.findByText(/Page 1 of 3/i)).toBeInTheDocument();

    const statusSelect = screen.getByLabelText(/Order status filter/i);
    await userEvent.selectOptions(statusSelect, "paid");

    await waitFor(() =>
      expect(apiClient.getOrderHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "paid", page: 1 })
      )
    );

    const nextButton = screen.getAllByRole("button", { name: /Next/i })[0];
    await userEvent.click(nextButton);

    await waitFor(() =>
      expect(apiClient.getOrderHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );

    const startDateInput = screen.getByLabelText(/Order start date filter/i);
    await userEvent.clear(startDateInput);
    await userEvent.type(startDateInput, "2024-02-01");

    await waitFor(() =>
      expect(apiClient.getOrderHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ startUtc: "2024-02-01T00:00:00.000Z", page: 1 })
      )
    );

    const endDateInput = screen.getByLabelText(/Order end date filter/i);
    await userEvent.clear(endDateInput);
    await userEvent.type(endDateInput, "2024-02-03");

    await waitFor(() =>
      expect(apiClient.getOrderHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startUtc: "2024-02-01T00:00:00.000Z",
          endUtc: "2024-02-03T23:59:59.999Z",
          page: 1,
        })
      )
    );

    expect(await screen.findByText(/Page 1 of 1/i)).toBeInTheDocument();
  });

  it("resets reservation pagination when filters change and advances pages when paginated", async () => {
    renderDashboard();

    await waitFor(() => expect((apiClient.getReservationHistory as any).mock.calls.length).toBeGreaterThan(0));

    expect(await screen.findByText(/Page 1 of 2/i)).toBeInTheDocument();
    const [, initialReservationRetention] = await screen.findAllByText(
      /Showing up to 5 results\. Retained for 6 months \(records start 2024-01-01\)\./i
    );
    expect(initialReservationRetention).toBeInTheDocument();

    const reservationNext = screen.getAllByRole("button", { name: /Next/i })[1];
    await userEvent.click(reservationNext);

    await waitFor(() =>
      expect(apiClient.getReservationHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );

    const reservationStatus = screen.getByLabelText(/Reservation status filter/i);
    await userEvent.selectOptions(reservationStatus, "pending");

    await waitFor(() =>
      expect(apiClient.getReservationHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "pending", page: 1 })
      )
    );

    const reservationStart = screen.getByLabelText(/Reservation start date filter/i);
    await userEvent.clear(reservationStart);
    await userEvent.type(reservationStart, "2024-03-01");

    await waitFor(() =>
      expect(apiClient.getReservationHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ startUtc: "2024-03-01T00:00:00.000Z", page: 1 })
      )
    );

    const reservationEnd = screen.getByLabelText(/Reservation end date filter/i);
    await userEvent.clear(reservationEnd);
    await userEvent.type(reservationEnd, "2024-03-05");

    await waitFor(() =>
      expect(apiClient.getReservationHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startUtc: "2024-03-01T00:00:00.000Z",
          endUtc: "2024-03-05T23:59:59.999Z",
          page: 1,
        })
      )
    );

    expect(await screen.findByText(/Page 1 of 1/i)).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Showing up to 5 results\. Retained for 9 months \(records start 2023-11-01\)\./i
      )
    ).toBeInTheDocument();
  });

  it("surfaces profile update errors from the server", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("Email already exists."));
    renderDashboard();

    await waitFor(() => expect(screen.getByText(/My Dashboard/i)).toBeInTheDocument());

    const emailInput = screen.getByLabelText(/Email/i);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "dup@example.com");

    await userEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(await screen.findByText(/Email already exists./i)).toBeInTheDocument();
  });

  it("shows password errors without clearing the form", async () => {
    mockChangePassword.mockRejectedValueOnce(new Error("Current password is incorrect."));
    renderDashboard();

    await screen.findByRole("heading", { name: /Password/i });

    await userEvent.type(screen.getByLabelText(/Current Password/i), "badpass");
    await userEvent.type(screen.getByLabelText(/^New Password$/i), "NewPass123");
    await userEvent.type(screen.getByLabelText(/Confirm Password/i), "NewPass123");

    await userEvent.click(screen.getByRole("button", { name: /Update Password/i }));

    expect(await screen.findByText(/Current password is incorrect./i)).toBeInTheDocument();
    expect((screen.getByLabelText(/Current Password/i) as HTMLInputElement).value).toBe("badpass");
  });
});
