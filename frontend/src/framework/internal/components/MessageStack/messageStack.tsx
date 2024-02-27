import React from "react";
import { TransitionGroup } from "react-transition-group";

import { GuiDisplayMessageType, GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close } from "@mui/icons-material";

export type MessageStackProps = {
    guiMessageBroker: GuiMessageBroker;
};

type GuiDisplayMessage = {
    type: GuiDisplayMessageType;
    message: string;
    datetimeMs: number;
};

export function MessageStack(props: MessageStackProps): React.ReactNode {
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
                            type: displayMessage.type,
                            message: displayMessage.message,
                            datetimeMs: Date.now(),
                        },
                    ]);
                }
            );

            function removeOldMessages() {
                setMessageStack((prevMessageStack) => {
                    const now = Date.now();
                    return prevMessageStack.filter((message) => now - message.datetimeMs < 10000);
                });
            }

            intervalRef.current = setInterval(removeOldMessages, 100000);

            return function unsubscribeFromDisplayMessageRequests() {
                unsubscribe();
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        },
        [props.guiMessageBroker]
    );

    return (
        <div className="absolute w-screen h-screen">
            <TransitionGroup>
                {messageStack.map((message, index) => (
                    <CSSTransition
                        key={index}
                        timeout={500}
                        classNames={{
                            enter: "opacity-0",
                            enterActive: "opacity-100",
                            exit: "opacity-100",
                            exitActive: "opacity-0",
                        }}
                    >
                        <Message key={index} type={message.type} message={message} />
                    </CSSTransition>
                ))}
            </TransitionGroup>
        </div>
    );
}

type MessageProps = {
    type: GuiDisplayMessageType;
    message: GuiDisplayMessage;
};

function Message(props: MessageProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "fixed bottom-0 right-0 p-2 text-white text-center text-sm z-[100] flex gap-4 items-center rounded",
                {
                    "bg-green-500": props.type === GuiDisplayMessageType.Success,
                    "bg-red-500": props.type === GuiDisplayMessageType.Error,
                    "bg-yellow-500": props.type === GuiDisplayMessageType.Warning,
                }
            )}
        >
            {props.message.message}
            <IconButton title="Close message" color="inherit">
                <Close fontSize="small" />
            </IconButton>
        </div>
    );
}
