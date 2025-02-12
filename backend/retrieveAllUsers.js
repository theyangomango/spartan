import readDoc from "./helper/firebase/readDoc";

export default async function retreiveAllUsers() {
    let globalUsers = await readDoc('global', 'users');
    return globalUsers.all;
}