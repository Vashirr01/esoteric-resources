package main

import (
	"fmt"
	"github.com/a-h/templ"
	"github.com/gin-gonic/gin"
)

type Resource struct {
	Title       string
	Description string
	Link        string
	Tags        []string
	Icon        string
}

var resources []Resource

func main() {
	fmt.Print("hello")
	router := gin.Default()
	addResource()
	router.GET("/", initialRender)
	router.Run("localhost:8080")
}

func render(c *gin.Context, status int, template templ.Component) error {
	c.Status(status)
	return template.Render(c.Request.Context(), c.Writer)
}

func postResource(resource Resource) {
	resources = append(resources, resource)
}

func addResource() {
	r := Resource{
		Icon:        "🏆",
		Title:       "CryptoZombies",
		Tags:        []string{"Smart Contracts"},
		Description: "#1 Solidity Tutorial & Ethereum Blockchain Programming Course",
		Link:        "https://cryptozombies.io",
	}
	postResource(r)
}

func initialRender(c *gin.Context) {
	render(c, 200, MainTemp(resources))
}
