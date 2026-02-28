const mongoose = require('mongoose');

async function fixDB() {
    try {
        await mongoose.connect('mongodb+srv://User:User123@cluster0.chxwllk.mongodb.net/stylmorph?retryWrites=true&w=majority&appName=Cluster0');
        const db = mongoose.connection.db;
        const result = await db.collection('avatars').updateMany(
            { modelUrl: { $regex: 'default.obj' } },
            { $set: { modelUrl: null } }
        );
        console.log(`Successfully cleared ${result.modifiedCount} broken avatar URLs`);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

fixDB();
