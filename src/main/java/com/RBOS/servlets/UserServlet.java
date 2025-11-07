package com.RBOS.servlets;

import com.RBOS.dao.UserDAO;
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
    private ObjectMapper objectMapper;
    
    @Override
    public void init() throws ServletException {
        objectMapper = new ObjectMapper();
        userDAO = new UserDAO(getServletContext());
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
                
                int userId = Integer.parseInt(splits[1]);
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
            Integer userId = userDAO.createUser(user);
            
            if (userId != null) {
                user.setUserId(userId);
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
            
            int userId = Integer.parseInt(pathInfo.split("/")[1]);
            User user = objectMapper.readValue(request.getReader(), User.class);
            user.setUserId(userId); // Ensure the ID matches the path
            
            boolean success = userDAO.updateUser(user);
            
            if (success) {
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
            
            int userId = Integer.parseInt(pathInfo.split("/")[1]);
            boolean success = userDAO.deleteUser(userId);
            
            if (success) {
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
}