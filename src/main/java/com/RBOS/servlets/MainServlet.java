package com.RBOS.servlets;

import com.RBOS.utils.DatabaseConnection;
import java.io.IOException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;

@WebServlet(name = "MainServlet", loadOnStartup = 1, urlPatterns = { "/api/init" })
public class MainServlet extends HttpServlet {

    @Override
    public void init() throws ServletException {
        try {
            var conn = DatabaseConnection.getConnection(getServletContext());
            System.out.println("Application initialized successfully");
        } catch (Exception e) {
            throw new ServletException("Failed to initialize application", e);
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":\"success\",\"message\":\"Application is running\"}");
    }
}
