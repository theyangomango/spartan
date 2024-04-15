import { readDoc } from "../helper/firebase/readDoc";

export default async function getChat(cid) {
    return await readDoc('messages', cid);
}