package main

import (
	"fmt"
	"github.com/a-h/templ"
	"github.com/gin-gonic/gin"
)

func main() {
	fmt.Print("hello")
	router := gin.Default()
	router.GET("/", initialRender)
	router.Run("localhost:8080")
}

func render(c *gin.Context, status int, template templ.Component) error {
	c.Status(status)
	return template.Render(c.Request.Context(), c.Writer)
}

func initialRender(c *gin.Context) {
	render(c, 200, MainTemp())
}
