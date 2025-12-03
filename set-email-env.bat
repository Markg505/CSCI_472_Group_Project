@echo off
REM Email Configuration for RBOS
REM Run this script before starting GlassFish to set email credentials

setx SMTP_HOST "smtp.gmail.com"
setx SMTP_PORT "587"
setx SMTP_USERNAME "gemrestaurant123@gmail.com"
setx SMTP_PASSWORD "rrrwgdamqkilvpge"
setx ADMIN_EMAIL "gemrestaurant123@gmail.com"

echo Email environment variables have been set!
echo Please restart your command prompt and GlassFish for changes to take effect.
pause