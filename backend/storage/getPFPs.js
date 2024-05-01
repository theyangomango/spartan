import getPFP from "./getPFP";

export default async function getPFPs(uids) {
    let pfps = [];
    for (uid of uids) {
        let pfp = await getPFP(uid);
        pfps.push(pfp);
    }
    return pfps;
}