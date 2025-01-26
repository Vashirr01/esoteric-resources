package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/a-h/templ"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

var db *sql.DB
var store *sessions.CookieStore

type Resource struct {
	Title       string
	Description string
	Link        string
	Tags        []string
	Icon        string
}

func main() {
	var err error
	err = godotenv.Load()
	if err != nil {
		log.Printf("Warning: error loading .env file")
	}
	store = sessions.NewCookieStore([]byte(os.Getenv("SESSION_SECRET")))

	// First connect to default postgres database
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=postgres sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
	)

	// Connect to postgres database first
	tempDB, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal(err)
	}

	_, err = tempDB.Exec("CREATE DATABASE resources")
	if err != nil {
		log.Printf("Notice: %v", err) // Might error if DB exists, that's ok
	}

	tempDB.Close()

	psqlInfo = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=resources sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
	)

	db, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Add retry logic for the connection
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database, attempt %d/%d: %v", i+1, maxRetries, err)
		time.Sleep(time.Second * 5)
	}
	if err != nil {
		log.Fatal("Failed to connect to database after multiple attempts:", err)
	}

	createTableSQL := `CREATE TABLE IF NOT EXISTS resources (
	    id SERIAL PRIMARY KEY,
	    title TEXT NOT NULL,
	    description TEXT NOT NULL,
	    link TEXT NOT NULL,
	    tags TEXT[], -- PostgreSQL array type for storing string arrays
	    icon TEXT NOT NULL
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}
	fmt.Println("Table created successfully!")

	fmt.Print("hello")
	router := gin.Default()
	router.GET("/", getResources)
	router.GET("/login", showLogin)
	router.POST("/login", handleLogin)
	router.POST("/logout", handleLogout)

	protected := router.Group("/")
	protected.Use(authMiddleware)
	{
		protected.POST("/", postResource)
		protected.DELETE("/resource/:title", deleteResourceByTitle)
	}
	router.Run("localhost:8080")
}

func authMiddleware(c *gin.Context) {
	session, _ := store.Get(c.Request, "session")
	if auth, ok := session.Values["authenticated"].(bool); !ok || !auth {
		// For HTMX requests
		if c.GetHeader("HX-Request") == "true" {
			c.Header("HX-Redirect", "/login")
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	c.Next()
}

func showLogin(c *gin.Context) {
	render(c, http.StatusOK, LoginPage(false))
}

func handleLogin(c *gin.Context) {
	session, _ := store.Get(c.Request, "session")

	if c.PostForm("password") == os.Getenv("ADMIN_PASSWORD") {
		session.Values["authenticated"] = true
		session.Options = &sessions.Options{
			Path:     "/",
			MaxAge:   86400 * 7,
			HttpOnly: true,
			Secure:   os.Getenv("ENVIRONMENT") == "production",
			SameSite: http.SameSiteLaxMode,
		}
		session.Save(c.Request, c.Writer)

		// Set HTMX headers
		c.Header("HX-Redirect", "/")
		c.Redirect(http.StatusFound, "/")
		return
	}

	render(c, http.StatusOK, LoginPage(true))
}

func handleLogout(c *gin.Context) {
	session, _ := store.Get(c.Request, "session")
	session.Values["authenticated"] = false
	session.Options.MaxAge = -1
	session.Save(c.Request, c.Writer)
	c.Redirect(http.StatusFound, "/")
}

func render(c *gin.Context, status int, template templ.Component) error {
	c.Status(status)
	return template.Render(c.Request.Context(), c.Writer)
}

func postResource(c *gin.Context) {
	session, _ := store.Get(c.Request, "session")
	isAdmin, _ := session.Values["authenticated"].(bool)
	var newR Resource
	newR.Title = c.PostForm("title")
	newR.Description = c.PostForm("description")
	newR.Link = c.PostForm("link")
	newR.Tags = strings.Split(c.PostForm("tags"), ",")
	newR.Icon = c.PostForm("icon")

	insertSQL := `INSERT INTO resources (title, description, link, tags, icon) VALUES ($1, $2, $3, $4, $5);`
	_, err := db.Exec(insertSQL, newR.Title, newR.Description, newR.Link, pq.Array(newR.Tags), newR.Icon)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Render just the new resource card
	render(c, http.StatusOK, ResourceCard(newR, isAdmin))
}

func getResources(c *gin.Context) {
	session, _ := store.Get(c.Request, "session")
	isAdmin, _ := session.Values["authenticated"].(bool)
	rows, err := db.Query("SELECT title, description, link, tags, icon FROM resources")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var resources []Resource
	for rows.Next() {
		var r Resource
		if err := rows.Scan(&r.Title, &r.Description, &r.Link, pq.Array(&r.Tags), &r.Icon); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		resources = append(resources, r)
	}

	render(c, 200, MainTemp(resources, isAdmin))
}

func deleteResourceByTitle(c *gin.Context) {
	title := c.Param("title")
	deleteSQL := `DELETE FROM resources WHERE title = $1;`
	res, err := db.Exec(deleteSQL, title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
		return
	}

	// Return 200 OK with no content - the element will be removed by HTMX
	c.Status(http.StatusOK)
}
