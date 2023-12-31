import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import { CircularProgress } from '@mui/material'

import { getAllGqlShopify, gqlShopify } from '@/pages/api/graphql'
import {
	GET_CART,
	GET_CART_ITEMS,
	GET_PAGE_CONTENT,
	GET_SHOP_NAME,
} from '@/pages/api/queries'

import layout from '@/styles/Layout.module.scss'
import styles from '@/styles/Cart.module.scss'
import PageHeader from '@/components/PageHeader'
import { useCart } from '@/context/state'
import Button from '@/components/Button'
import { getCheckoutUrl, updateCart, updateCartItem } from '@/utils/cartUtils'
import { getPageDescription, parsePrice } from '@/utils/utils'

const CartItem = ({ item }: any) => {
	const [isLoading, setIsLoading] = useState(false)
	const [quantity, setQuantity] = useState(item.quantity)
	const { cartId, items, updateCartId, updateCartItems } = useCart()

	const { merchandise } = item
	const price = parsePrice(merchandise.price.amount, 'fullPrice', merchandise)
	const totalPrice = parsePrice(
		merchandise.price.amount * quantity,
		'fullPrice',
		merchandise
	)

	const handleQuantityChange = async (amount: number) => {
		setIsLoading(true)
		updateCartItem(
			item.id,
			amount,
			cartId,
			items,
			updateCartId,
			updateCartItems
		).then(() => {
			setIsLoading(false)
			setQuantity(amount)
		})
	}

	const quantitySelector = (
		<>
			<div
				className={`${styles.action_icon} ${
					isLoading ? styles.loading_hide : ''
				}`}
				onClick={() => handleQuantityChange(quantity - 1)}
			>
				<RemoveCircleOutlineOutlinedIcon />
			</div>
			<input
				className={`${isLoading ? styles.loading_hide : ''}`}
				type='number'
				value={quantity}
				onChange={(e) => {
					if (e.target.value.length) {
						handleQuantityChange(parseInt(e.target.value, 10))
					} else {
						e.target.value = quantity
					}
				}}
			/>
			<div
				className={`${styles.action_icon} ${
					isLoading ? styles.loading_hide : ''
				}`}
				onClick={() => handleQuantityChange(quantity + 1)}
			>
				<AddCircleOutlineOutlinedIcon />
			</div>
		</>
	)

	if (quantity > 0) {
		return (
			<>
				<div className={styles.cart_item_column}>
					<Link href={`/produkter/${merchandise.product.handle}`}>
						<h3>{merchandise.product.title}</h3>
					</Link>
					<h5>{price}</h5>
					{merchandise.product.variants.edges.length > 1 ? (
						<h4>{merchandise.title}</h4>
					) : null}
					<div className={`${styles.quantity_container}  ${styles.mobile}`}>
						{quantitySelector}
					</div>
				</div>
				<div
					className={`${styles.cart_item_column} ${styles.quantity_container}  ${styles.desktop}`}
				>
					{isLoading ? (
						<div className={styles.loading}>
							<CircularProgress disableShrink />
						</div>
					) : null}
					{quantitySelector}
				</div>
				<div className={styles.cart_item_column}>
					<h5>{totalPrice}</h5>
				</div>
			</>
		)
	}
	return null
}

const Cart = ({ shopInfo, cartInfo }: any) => {
	const [cartDetails, setCartDetails] = useState<any>(null)
	const [cartItems, setCartItems] = useState<any[]>([])

	const { cartId, items, updateCartId, updateCartItems } = useCart()

	const totalPrice = parsePrice(
		cartDetails?.cost?.subtotalAmount?.amount,
		'fullPrice'
	)

	const cartLoading =
		cartId && items === null
			? true
			: items && items > 0 && cartItems.length === 0
			? true
			: false

	useEffect(() => {
		if (items && items > 0) {
			gqlShopify(GET_CART, { cartId: cartId }).then(async (result) => {
				if (result.cart?.totalQuantity > 0) {
					setCartDetails(result.cart)
					const cartLines = await getAllGqlShopify(
						['cart', 'lines'],
						GET_CART_ITEMS,
						{
							cartId: cartId,
							amount: 2,
						}
					)
					setCartItems(cartLines.map((line) => line.node))
				} else {
					updateCart(updateCartId, updateCartItems)
				}
			})
		}
	}, [cartId, items, updateCartId, updateCartItems])

	const title = `${shopInfo.name} - ${shopInfo.brand.slogan} | Din kundvagn`

	const cartDeactivated = false

	return (
		<>
			<Head>
				<title>{title}</title>
				<meta
					name='description'
					content={getPageDescription(shopInfo.brand.shortDescription)}
				/>
			</Head>
			<div className={`${layout.container} ${layout.no_top_margin}`}>
				<PageHeader>Din kundvagn</PageHeader>
				{cartLoading ? (
					<PageHeader style={{ textAlign: 'center' }} heading='h2'>
						<CircularProgress disableShrink />
					</PageHeader>
				) : items && items > 0 ? (
					<>
						<div className={`${layout.wrapped_container} ${styles.cart_items}`}>
							{cartItems.map((item) => (
								<CartItem key={item.id} item={item} />
							))}
						</div>
						<div
							className={`${layout.wrapped_container} ${styles.cart_details}`}
						>
							<div className={styles.cart_info}>
								<div
									className={styles.cart_info_content}
									dangerouslySetInnerHTML={{ __html: cartInfo.body }}
								/>
							</div>
							<div className={styles.cart_summary}>
								<h3>
									Summa produkter: <span>{totalPrice}</span>
								</h3>
								<span>Moms ingår och frakt beräknas i kassan</span>
								<div
									className={`${layout.wrapped_container} ${styles.cart_buttons}`}
								>
									{cartDeactivated ? null : (
										<Button
											primary
											clickCallback={async () => {
												const url = await getCheckoutUrl(cartId)
												url ? (window.location.href = url) : null
											}}
										>
											Gå till kassan
										</Button>
									)}
								</div>
							</div>
						</div>
					</>
				) : (
					<div className={layout.wrapped_container}>
						<PageHeader style={{ textAlign: 'center' }} heading='h2'>
							Din kundvagn är tom
						</PageHeader>
					</div>
				)}
			</div>
		</>
	)
}

export const getServerSideProps = async () => {
	const shop = await gqlShopify(GET_SHOP_NAME, {})

	const cartInfo = await gqlShopify(GET_PAGE_CONTENT, {
		handle: 'kassainfo',
	})

	const gqlData = {
		shopInfo: shop.shop,
		cartInfo: cartInfo.page,
	}

	return {
		props: { ...gqlData },
	}
}

export default Cart
