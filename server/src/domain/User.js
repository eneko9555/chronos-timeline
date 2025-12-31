class User {
    constructor({ id, email, displayName, photoURL }) {
        this.id = id; // Google UID
        this.email = email;
        this.displayName = displayName;
        this.photoURL = photoURL;
    }
}

module.exports = User;
