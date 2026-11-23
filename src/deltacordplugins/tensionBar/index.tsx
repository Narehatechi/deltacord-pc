/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin, { IconProps } from "@utils/types";
import { DraftStore, DraftType, showToast, Toasts, UserStore, useStateFromStores } from "@webpack/common";

const maxLength = () => UserStore.getCurrentUser()?.premiumType === 2 ? 4000 : 2000;

function Gauge({ percent = 0, height = 24, width = 24, className }: IconProps & { percent?: number; }) {
    const full = Math.min(percent, 100);
    const color = percent > 100 ? "#ff4a4a" : percent >= 90 ? "#ffcc33" : "#ff9a2e";
    return (
        <svg viewBox="0 0 24 24" height={height} width={width} className={className}>
            <rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <rect x="9" y={4 + 16 * (1 - full / 100)} width="6" height={16 * full / 100} fill={color} />
        </svg>
    );
}

const TensionButton: ChatBarButtonFactory = ({ channel, isAnyChat }) => {
    const length = useStateFromStores([DraftStore], () => DraftStore.getDraft(channel.id, DraftType.ChannelMessage)?.length ?? 0);
    if (!isAnyChat) return null;
    const percent = Math.round(length / maxLength() * 100);
    return (
        <ChatBarButton
            tooltip={`TP ${percent}%`}
            onClick={() => showToast(`TP ${percent}%: ${length} of ${maxLength()} characters`, Toasts.Type.MESSAGE)}
        >
            <Gauge percent={percent} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "TensionBar",
    description: "A TP gauge in the chat bar that fills as your message gets close to the length limit.",
    authors: [Devs.Narehatechi],
    chatBarButton: {
        icon: Gauge,
        render: TensionButton
    }
});
