package com.RBOS.servlets;

import com.RBOS.dao.UserDAO;
import com.RBOS.dao.AuditLogDAO;
import com.RBOS.models.User;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

@WebServlet("/api/users/*")
public class UserServlet extends HttpServlet {
    private UserDAO userDAO;
    private AuditLogDAO auditDAO;
    private ObjectMapper objectMapper;
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        userDAO = new UserDAO(getServletContext());
        auditDAO = new AuditLogDAO(getServletContext());
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            
            if (pathInfo == null || pathInfo.equals("/")) {
                // Get all users
                List<User> users = userDAO.getAllUsers();
                response.getWriter().write(objectMapper.writeValueAsString(users));
            } else if (pathInfo.startsWith("/email/")) {
                // Get user by email
                String[] splits = pathInfo.split("/");
                if (splits.length != 3) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }
                
                String email = splits[2];
                User user = userDAO.getUserByEmail(email);
                
                if (user != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(user));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } else {
                // Get user by ID
                String[] splits = pathInfo.split("/");
                if (splits.length != 2) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                    return;
                }

                String userId = splits[1];
                User user = userDAO.getUserById(userId);
                
                if (user != null) {
                    response.getWriter().write(objectMapper.writeValueAsString(user));
                } else {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            User user = objectMapper.readValue(request.getReader(), User.class);
            String userId = userDAO.createUser(user);

            if (userId != null) {
                user.setUserId(userId);

                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("user", userId, "create", actorId, getSessionUserName(request),
                                null, "User created: " + user.getEmail());
                } catch (Exception e) {
                    // Don't fail the request if audit logging fails
                    e.printStackTrace();
                }

                response.setStatus(HttpServletResponse.SC_CREATED);
                response.getWriter().write(objectMapper.writeValueAsString(user));
            } else {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to create user");
            }
        } catch (SQLException e) {
            if (e.getErrorCode() == 19) { // SQLite constraint violation
                response.sendError(HttpServletResponse.SC_CONFLICT, "Email already exists");
            } else {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
            e.printStackTrace();
        } catch (IOException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
    
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String userId = pathInfo.split("/")[1];
            User user = objectMapper.readValue(request.getReader(), User.class);
            user.setUserId(userId); // Ensure the ID matches the path
            
            // Get old user data for audit
            User oldUser = userDAO.getUserById(userId);
            String oldValue = oldUser != null ? objectMapper.writeValueAsString(oldUser) : null;

            boolean success = userDAO.updateUser(user);

            if (success) {
                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("user", userId, "update", actorId, getSessionUserName(request),
                                oldValue, objectMapper.writeValueAsString(user));
                } catch (Exception e) {
                    e.printStackTrace();
                }

                response.getWriter().write(objectMapper.writeValueAsString(user));
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
    
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        try {
            String pathInfo = request.getPathInfo();
            if (pathInfo == null || pathInfo.split("/").length != 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }

            String userId = pathInfo.split("/")[1];

            // Get user data before deletion for audit
            User deletedUser = userDAO.getUserById(userId);
            String oldValue = deletedUser != null ? objectMapper.writeValueAsString(deletedUser) : null;

            boolean success = userDAO.deleteUser(userId);

            if (success) {
                // Log audit
                try {
                    String actorId = getSessionUserId(request);
                    auditDAO.log("user", userId, "delete", actorId, getSessionUserName(request),
                                oldValue, null);
                } catch (Exception e) {
                    e.printStackTrace();
                }

                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            } else {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            e.printStackTrace();
        } catch (NumberFormatException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private String getSessionUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return "system";
        Object userId = session.getAttribute("userId");
        return userId != null ? userId.toString() : "system";
    }

    private String getSessionUserName(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return "System";
        try {
            String userId = getSessionUserId(request);
            if ("system".equals(userId)) return "System";
            User user = userDAO.getUserById(userId);
            return user != null ? user.getFullName() : "System";
        } catch (Exception e) {
            return "System";
        }
    }
}

