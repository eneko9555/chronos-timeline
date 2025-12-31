const UserRepository = require('../../domain/UserRepository');
const UserModel = require('./schemas/UserSchema');
const User = require('../../domain/User');

class MongoUserRepository extends UserRepository {
    async findById(id) {
        const doc = await UserModel.findById(id);
        if (!doc) return null;
        return new User({
            id: doc._id,
            email: doc.email,
            displayName: doc.displayName,
            photoURL: doc.photoURL
        });
    }

    async save(user) {
        const doc = await UserModel.findOneAndUpdate(
            { _id: user.id },
            {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            },
            { upsert: true, new: true }
        );
        return new User({
            id: doc._id,
            email: doc.email,
            displayName: doc.displayName,
            photoURL: doc.photoURL
        });
    }
}

module.exports = MongoUserRepository;
