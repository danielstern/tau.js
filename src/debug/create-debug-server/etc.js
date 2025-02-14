export function parse_message(message) {
    const message_string = message.toString();
    const parsed_message = JSON.parse(message_string);
    return parsed_message
}