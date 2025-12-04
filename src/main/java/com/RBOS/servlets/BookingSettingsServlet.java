package com.RBOS.servlets;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/api/booking-settings")
public class BookingSettingsServlet extends HttpServlet {
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final BookingSettings DEFAULTS = new BookingSettings();

    private Path settingsPath() {
        return Paths.get(System.getProperty("user.home"), ".rbos", "booking-settings.json");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        try {
            BookingSettings settings = readSettings();
            mapper.writeValue(resp.getWriter(), settings);
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            mapper.writeValue(resp.getWriter(), Map.of("message", "Failed to load booking settings"));
        }
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        try {
            BookingSettings incoming = mapper.readValue(req.getReader(), BookingSettings.class);
            if (incoming == null) incoming = new BookingSettings();

            if (incoming.openTime != null && incoming.closeTime != null && incoming.openTime.compareTo(incoming.closeTime) >= 0) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                mapper.writeValue(resp.getWriter(), Map.of("message", "closeTime must be after openTime"));
                return;
            }

            Files.createDirectories(settingsPath().getParent());
            mapper.writerWithDefaultPrettyPrinter().writeValue(settingsPath().toFile(), incoming);
            mapper.writeValue(resp.getWriter(), incoming);
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            mapper.writeValue(resp.getWriter(), Map.of("message", "Failed to save booking settings"));
        }
    }

    private BookingSettings readSettings() {
        try {
            Path path = settingsPath();
            if (Files.exists(path)) {
                return mapper.readValue(path.toFile(), BookingSettings.class);
            }
        } catch (Exception ignored) {
        }
        return DEFAULTS;
    }

    public static class BookingSettings {
        public String openTime = "09:00";
        public String closeTime = "21:00";
        public Map<String, Boolean> daysOpen = defaultDays();
        public int maxDaysOut = 30;
        public int reservationLengthMinutes = 90;

        private static Map<String, Boolean> defaultDays() {
            Map<String, Boolean> m = new HashMap<>();
            m.put("mon", true);
            m.put("tue", true);
            m.put("wed", true);
            m.put("thu", true);
            m.put("fri", true);
            m.put("sat", true);
            m.put("sun", false);
            return m;
        }
    }
}
