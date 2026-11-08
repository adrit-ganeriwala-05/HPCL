package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
)

var ErrInvalidToken = errors.New("invalid or expired token")

type Claims struct {
	UserID uint        `json:"userId"`
	Role   models.Role `json:"role"`
	// SessionVersion is the user's models.User.SessionVersion at the moment
	// this token was issued. RequireAuth rejects the token once the user's
	// counter has moved on (Logout increments it), which is how a logged-out
	// token stops working even though JWTs are otherwise self-contained.
	// Tokens issued before this claim existed decode it as 0.
	SessionVersion int `json:"sv"`
	jwt.RegisteredClaims
}

func GenerateToken(secret string, userID uint, role models.Role, sessionVersion int, ttl time.Duration) (string, error) {
	claims := Claims{
		UserID:         userID,
		Role:           role,
		SessionVersion: sessionVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret, tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
