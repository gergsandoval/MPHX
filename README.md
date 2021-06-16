# MPHX

## Authorization Bearer Token
```
"Bearer" + "ACCESS TOKEN DE MERCADOPAGO PRODUCCION" Ejemplo:
Bearer APP_USR-XXXXXXXXXXX-XXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXX
```
## Recursos
https://www.mercadopago.com.ar/developers/es/guides/resources/faqs/credentials
https://www.mercadopago.com.ar/developers/panel/credentials

## Metodo HTTP POST

```
Payload - JSON
{
    "amount": 8500,
    "delta": 0.01
}
```
```
amount: El monto que te entregan como descuento, el maximo descuento se calcula automaticamente || minimo 1 || default 10000
```

```
delta: Esto ayuda a encontrar el ultimo descuento con el cual se llega al maximo del descuento  || minimo 0.01 || maximo 0.09 || default 0.01
       Ex: Si del maximo descuento maximo de 5950 y un delta de 0.01, luego de buscar todas las compras que tengan 70% de descuento.
       Buscara una ultima que matchee que sumandose al descuento de entre 5890.5 y 5950
```
## Posibles Responses
```
200 - {
  "results": {
        "total_amount": 8500,  // amount enviado en el payload.
        "maximum": 5950, // El descuento maximo, 70% del amount enviado en el payload
        "used": 5950 // El descuento maximo usado hasta el momento
    },
    "purchases": [ // Un array con todas las compras que consideraron para hacer los calculos de results.
        {
            "id": 15353156, // Este id sirve para ver el detalle en la pagina de mercadopago
            "description": "Producto", // La descripcion de lo que compraron
            "date_approved": "2021-06-14T16:46:16.000-04:00",  // Cuando se genero la compra
            "transaction_amount": 4704.15, // El monto original de la compra
            "coupon_amount": 2641.17, // El descuento que obtuvieron 
            "discount": 0.56, // el porcentaje de descuento => 56%
            "month": 5 // El mes en el cual se hizo la compra (sumenle 1) :)
        }
    ]
}
```
```
400 - {
    "statusCode": 400,
    "error": "El amount debe ser mayor que 0"
}
Revisar el amount enviado en el payload.
```
```
400 - {
    "statusCode": 400,
    "error": "El delta debe estar entre 0.01 y 0.09"
}
Revisar el delta enviado en el payload.
```
```
401 - {
    "statusCode": 401,
    "error": "unauthorized"
}
Revisar el Bearer Token
```
