import getPFP from "../../backend/storage/getPFP";

export default async function getStoriesDisplayFormat(db_stories) {
    let uids = [];
    let data = [];

    for (db_story of db_stories) {
        let uid = db_story.uid;
        let sid = db_story.sid;

        if (uids.includes(uid)) { // uid already included
            let index = uids.indexOf(uid);
            data[index].stories.push({
                story_id: sid,
                story_image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZmlsZXxlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80',
                swipeText: 'Custom swipe text for this story',
                onPress: () => console.log('story 1 swiped'),
            });
        }
        else { // uid not included
            let handle = db_story.handle;
            let userImageUID = await getPFP(uid);

            uids.push(uid);
            data.push({
                user_id: uid,
                user_image: userImageUID,
                user_name: handle,
                stories: [
                    {
                        story_id: sid,
                        story_image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZmlsZXxlbnwwfHwwfHw%3D&ixlib=rb-1.2.1&w=1000&q=80',
                        swipeText: 'Custom swipe text for this story',
                        onPress: () => console.log('story 1 swiped'),
                    }
                ]
            });
        }
    };

    return data;
}