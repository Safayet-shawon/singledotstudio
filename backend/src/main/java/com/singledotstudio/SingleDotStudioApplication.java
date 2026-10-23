package com.singledotstudio;

import com.singledotstudio.security.PasswordHashTool;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class SingleDotStudioApplication {

    public static void main(String[] args) {
        // Operator helper: prints a password hash for the first administrator and exits without starting the server.
        if (args.length > 0 && "--hash-password".equals(args[0])) {
            System.exit(PasswordHashTool.run());
        }
        SpringApplication.run(SingleDotStudioApplication.class, args);
    }
}
