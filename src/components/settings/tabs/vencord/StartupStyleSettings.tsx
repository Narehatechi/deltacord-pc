/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Select } from "@webpack/common";

import { STARTUP_STYLES } from "../../../../splash";

/** Which startup animation plays (the same fourteen styles as Deltacord on Android). */
export function StartupStyleSettings() {
    const settings = useSettings(["startupAnimation", "startupAnimationStyle"]);

    if (!IS_DISCORD_DESKTOP || !settings.startupAnimation) return null;

    return (
        <ErrorBoundary noop>
            <Heading tag="h5">Startup animation style (plays on the next launch)</Heading>
            <Select
                className={Margins.bottom20}
                placeholder="Startup animation style"
                options={[
                    { label: "Random (a different one each launch)", value: "random" },
                    ...STARTUP_STYLES.map(([value, label]) => ({ label, value: value as string }))
                ]}
                select={v => settings.startupAnimationStyle = v}
                isSelected={v => (settings.startupAnimationStyle ?? "upgraded") === v}
                serialize={identity}
            />
        </ErrorBoundary>
    );
}
