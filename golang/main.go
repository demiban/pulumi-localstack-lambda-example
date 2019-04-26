package main

import (
	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"log"
)

type message struct {
	Data string `json:"message"`
}

func Handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	var msg message

	err := json.Unmarshal([]byte(request.Body), &msg)
	if err != nil {
		log.Print(err)
	}

	return events.APIGatewayProxyResponse{
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body:       msg.Data,
		StatusCode: 200,
	}, nil

}

func main() {
	lambda.Start(Handler)
}
