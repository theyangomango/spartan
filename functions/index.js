const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

exports.onMessageUpdate = onDocumentUpdated('messages/{cid}', (event) => {
  const cid = event.params.cid;
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  const beforeLength = before?.content?.length || 0;
  const afterLength = after?.content?.length || 0;

  if (afterLength > beforeLength) {
    const newMessages = after.content.slice(beforeLength);
    console.log(`New messages in ${cid}:`, newMessages);
  }

  return null;
});
