package com.singledotstudio.security;

import java.io.Console;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Prompts for a password (no echo) and prints the value to use for APP_ADMIN_BOOTSTRAP_PASSWORD_HASH.
 * Run with: java -jar singledotstudio-backend.jar --hash-password
 */
public final class PasswordHashTool {

    private PasswordHashTool() {
    }

    public static int run() {
        Console console = System.console();
        if (console == null) {
            System.err.println("A terminal is required so the password is not echoed or stored in shell history.");
            return 2;
        }
        char[] first = console.readPassword("New admin password (at least 12 characters): ");
        char[] second = console.readPassword("Repeat password: ");
        try {
            if (first == null || second == null || !java.util.Arrays.equals(first, second)) {
                System.err.println("The passwords do not match.");
                return 1;
            }
            String problem = weakness(new String(first));
            if (problem != null) {
                System.err.println(problem);
                return 1;
            }
            System.out.println("{bcrypt}" + new BCryptPasswordEncoder(12).encode(new String(first)));
            return 0;
        } finally {
            if (first != null) java.util.Arrays.fill(first, '\0');
            if (second != null) java.util.Arrays.fill(second, '\0');
        }
    }

    static String weakness(String password) {
        if (password.length() < 12) return "Use at least 12 characters.";
        if (password.length() > 72) return "Use at most 72 characters (bcrypt limit).";
        boolean letter = password.chars().anyMatch(Character::isLetter);
        boolean digit = password.chars().anyMatch(Character::isDigit);
        if (!letter || !digit) return "Include letters and numbers.";
        return null;
    }
}
