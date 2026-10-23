package com.singledotstudio.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordHashToolTest {

    @Test
    void weakPasswordsAreRejected() {
        assertThat(PasswordHashTool.weakness("short1")).contains("12");
        assertThat(PasswordHashTool.weakness("onlyletterslongenough")).contains("numbers");
        assertThat(PasswordHashTool.weakness("123456789012345")).contains("letters");
        assertThat(PasswordHashTool.weakness("a1".repeat(40))).contains("72");
    }

    @Test
    void aReasonablePasswordIsAccepted() {
        assertThat(PasswordHashTool.weakness("Correct-Horse-9")).isNull();
    }
}
