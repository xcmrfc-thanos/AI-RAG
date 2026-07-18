package com.knowledge.base.ai.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ModelProviderConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withUserConfiguration(ModelProvider.class);

    @Test
    void shouldExposeDefaultModelWhenDevStubEnvironmentVariableIsEnabled() {
        contextRunner
                .withPropertyValues("AI_DEV_STUB=true")
                .run(context -> {
                    ModelProvider provider = context.getBean(ModelProvider.class);

                    assertThat(provider.getAvailableModels())
                            .anySatisfy(model -> {
                                assertThat(model.getKey()).isEqualTo("qwen");
                                assertThat(model.getIsDefault()).isTrue();
                            });
                });
    }
}
