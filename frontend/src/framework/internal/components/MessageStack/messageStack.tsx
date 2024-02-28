import React from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { GuiDisplayMessageType, GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close } from "@mui/icons-material";

export type MessageStackProps = {
    guiMessageBroker: GuiMessageBroker;
};

type GuiDisplayMessage = {
    id: string;
    type: GuiDisplayMessageType;
    message: React.ReactNode;
    datetimeMs: number;
    ref: React.RefObject<HTMLDivElement>;
    displayDurationMs: number;
};

export function MessageStack(props: MessageStackProps): React.ReactNode {
    const [idCount, setIdCount] = React.useState<number>(0);
    const [messageStack, setMessageStack] = React.useState<GuiDisplayMessage[]>([]);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    React.useEffect(
        function subscribeToDisplayMessageRequests() {
            const unsubscribe = props.guiMessageBroker.subscribeToEvent(
                GuiEvent.DisplayMessageRequest,
                function handleDisplayMessageRequest(displayMessage) {
                    setMessageStack((prevMessageStack) => [
                        ...prevMessageStack,
                        {
                            id: `message-${idCount}`,
                            type: displayMessage.type,
                            message: displayMessage.message,
                            datetimeMs: Date.now(),
                            ref: React.createRef(),
                            displayDurationMs: displayMessage.displayDurationMs ?? 5000,
                        },
                    ]);
                    setIdCount((prevIdCount) => prevIdCount + 1);
                }
            );

            function removeOldMessages() {
                setMessageStack((prevMessageStack) => {
                    const now = Date.now();
                    return prevMessageStack.filter((message) => now - message.datetimeMs < message.displayDurationMs);
                });
            }

            intervalRef.current = setInterval(removeOldMessages, 5000);

            return function unsubscribeFromDisplayMessageRequests() {
                unsubscribe();
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        },
        [props.guiMessageBroker, idCount]
    );

    function handleCloseMessage(id: string) {
        setMessageStack((prevMessageStack) => prevMessageStack.filter((message) => message.id !== id));
    }

    return (
        <TransitionGroup className="absolute right-0 bottom-0 w-full h-full flex flex-col-reverse z-[100] items-end content-end gap-1 pointer-events-none m-2">
            {messageStack.slice(Math.max(0, messageStack.length - 3), messageStack.length).map((message) => (
                <CSSTransition
                    key={message.id}
                    nodeRef={message.ref}
                    timeout={500}
                    classNames={{
                        enter: "!opacity-0",
                        enterActive: "!h-auto !opacity-100 !transition-opacity !duration-500",
                        exitActive: "!h-0 !min-h-0 !overflow-hidden !opacity-0 !transition-all !duration-500",
                    }}
                >
                    <div
                        ref={message.ref}
                        className={resolveClassNames(
                            "p-2 text-white text-center text-sm z-[100] flex gap-4 items-center rounded pointer-events-auto overflow-hidden min-h-0",
                            {
                                "bg-green-500": message.type === GuiDisplayMessageType.Success,
                                "bg-red-500": message.type === GuiDisplayMessageType.Error,
                                "bg-yellow-500": message.type === GuiDisplayMessageType.Warning,
                            }
                        )}
                    >
                        <span>{message.message}</span>
                        <IconButton
                            title="Close message"
                            color="inherit"
                            onClick={() => handleCloseMessage(message.id)}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </div>
                </CSSTransition>
            ))}
        </TransitionGroup>
    );
}
