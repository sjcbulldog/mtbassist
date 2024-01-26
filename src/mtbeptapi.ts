import * as vscode from 'vscode';
import fetch, { Headers, Request } from "node-fetch";

interface ResponseKey {
    response_key: string ;
} ;

interface ResponseText {
    response_text: string ;
} ;

async function askQuestionInternal(question: String) : Promise<ResponseKey> {
    let ret: Promise<ResponseKey> = new Promise<ResponseKey>((resolve, reject) => { 
        const headers: Headers = new Headers() ;
        headers.set('Content-Type', 'application/json') ;
        headers.set('Accept', 'application/json') ;
        headers.set('Access-Control-Allow-Headers', 'Content-Type') ;
        headers.set('x-api-key', 'oR9t6SSWyP1PXsD7pg3yQ5dZSN4yukl05oHsOZyt');
    
        let queryobj = {
            question : question,
            user_id : "butch.griffin@infineon.com"
        } ;
        let text: string = JSON.stringify(queryobj) ;

        let url: string = "https://conversation-api.ept.ai/conversation";
        let init = {
            headers: headers,
            method: "POST",
            body: text
        } ;

        let reqobj : Request = new Request(url, init) ;
        fetch(reqobj)
        .then((resp) => resp.json())
        .then((data) => resolve(data as ResponseKey))
        .catch((err) => reject(err)) ;
    }) ;

    return ret ;
}

async function getResponse(respkey: string) : Promise<ResponseText> {
    let ret: Promise<ResponseText> = new Promise<ResponseText>((resolve, reject) => {
        console.log("getResponse '" + respkey + "'");
        const headers: Headers = new Headers() ;
        headers.set('x-api-key', 'oR9t6SSWyP1PXsD7pg3yQ5dZSN4yukl05oHsOZyt');
        headers.set('Accept', 'application/json') ;
        headers.set('Access-Control-Allow-Headers', 'Content-Type') ;
        let url: string = "https://conversation-api.ept.ai/response?response_key=" + respkey ;
        let init = {
            headers: headers,
            method: "GET"
        } ;

        let reqobj : Request = new Request(url, init) ;
        fetch(reqobj)
        .then((resp) => {
            if (resp.status === 200) {
                console.log("Response ok - status 200");
                return resp.json() ;
            }
            console.log("Response not ready, status " + resp.status);            
            return getResponse(respkey) ;
        })
        .then((data) => resolve(data as ResponseText))
        .catch((err) => reject(err)) ;        
    }) ;

    return ret;
}

export async function askQuestion(question: string) : Promise<string> {
    let ret: Promise<string> = new Promise<string>((resolve, reject) => {
        let resp: ResponseKey ;
        let answer: string ;

        console.log("askQuestion '" + question + "'") ;
        askQuestionInternal(question)
            .then((resp) => {
                console.log("responseKey '" + resp.response_key + "'");
                if (resp.response_key === undefined) {
                    reject(new Error("invalid response from server rest API"));
                }
                else {
                    getResponse(resp.response_key)
                        .then((resptxt) => {
                            console.log("Answer ready '" + resptxt.response_text + "'");
                            resolve(resptxt.response_text);
                        })
                        .catch((err) => reject(err)) ;
                }
            })
            .catch((err) => reject(err)) ;
    }) ;

    return ret ;
}
