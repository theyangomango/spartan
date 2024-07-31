import { View } from "react-native";
import NotificationsModal from "./1_feed/Notifications/NotificationsModal";

export default function Notifications({ navigation, routes }) {
    console.log(navigation);

    return (
        <NotificationsModal />
    )
}