package main

import (
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type message struct {
	Data string `json:"message"`
}

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	var msg message

	msg.Data = "Hello from golang"

	return events.APIGatewayProxyResponse{
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body:       msg.Data,
		StatusCode: 200,
	}, nil

}

func main() {
	lambda.Start(handler)
}
