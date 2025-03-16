import jwt from 'jsonwebtoken';

export const authMiddleware = (socket, next) => {
    const token = socket.handshake.auth.accessToken;

    const isValid = jwt.verify(token, process.env.JWT_SECRET);
    if (isValid) {
        return next();
    }

    next(new Error('Unauthorized'));
};
