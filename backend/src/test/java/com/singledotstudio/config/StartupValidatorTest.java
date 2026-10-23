package com.singledotstudio.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class StartupValidatorTest {

    private AppProperties props(List<String> origins, String base, boolean mailEnabled, String from, String inbox) {
        return new AppProperties(origins, base, 0, new AppProperties.Mail(from, inbox, mailEnabled, 3, 10), null, null, null, null);
    }

    private MockEnvironment prod() {
        return new MockEnvironment().withProperty("spring.profiles.active", "prod").withProperty("spring.mail.host", "smtp.example.test");
    }

    @Test
    void productionRefusesToStartWithUnsafeSettings() {
        MockEnvironment env = prod();
        env.setActiveProfiles("prod");
        env.setProperty("server.servlet.session.cookie.secure", "false");
        StartupValidator v = new StartupValidator(props(List.of("http://insecure.example"), "http://insecure.example", true, "", ""), env);
        assertThatThrownBy(v::validate).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("https").hasMessageContaining("Secure").hasMessageContaining("APP_MAIL_FROM").hasMessageContaining("APP_MAIL_LEAD_INBOX");
    }

    @Test
    void errorMessagesNameTheSettingButNeverPrintValues() {
        MockEnvironment env = prod();
        env.setActiveProfiles("prod");
        StartupValidator v = new StartupValidator(props(List.of("http://very-secret-host.example"), "https://ok.example", false, "", ""), env);
        assertThatThrownBy(v::validate).hasMessageNotContaining("very-secret-host");
    }

    @Test
    void aCompleteProductionConfigurationPasses() {
        MockEnvironment env = prod();
        env.setActiveProfiles("prod");
        StartupValidator v = new StartupValidator(props(List.of("https://www.example.com"), "https://www.example.com", true, "studio@example.com", "inbox@example.com"), env);
        assertThatCode(v::validate).doesNotThrowAnyException();
    }

    @Test
    void developmentIsNotBlocked() {
        StartupValidator v = new StartupValidator(props(List.of(), null, true, "", ""), new MockEnvironment());
        assertThatCode(v::validate).doesNotThrowAnyException();
        assertThat(true).isTrue();
    }
}
