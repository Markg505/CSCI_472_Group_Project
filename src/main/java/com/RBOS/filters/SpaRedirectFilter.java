package com.RBOS.filters;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Ensures client-side routes (e.g. /admin-login, /dashboard) get index.html instead of 404.
 * Skips API, WebSocket, and static asset requests.
 */
@WebFilter("/*")
public class SpaRedirectFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        String path = req.getRequestURI();
        // Remove context path if present
        String context = req.getContextPath();
        if (context != null && !context.isEmpty() && path.startsWith(context)) {
            path = path.substring(context.length());
        }

        boolean isGet = "GET".equalsIgnoreCase(req.getMethod());
        boolean looksLikeAsset = path.contains("."); // e.g. .js, .css, .png
        boolean isApi = path.startsWith("/api/");
        boolean isWebsocket = path.startsWith("/realtime");
        boolean isAssets = path.startsWith("/assets/") || path.startsWith("/favicon");

        if (isGet && !looksLikeAsset && !isApi && !isWebsocket && !isAssets) {
            // Forward client-side route to index.html
            req.getRequestDispatcher("/index.html").forward(req, resp);
            return;
        }

        chain.doFilter(request, response);
    }
}
