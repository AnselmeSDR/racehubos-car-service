export * from '@base'
import Base from '@base'
import ServiceBadge from '@addon/web/ServiceBadge.jsx'

/** The car's picture, name and figures, with its service status beside them. */
export default function CarIdentity(props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Base {...props} />
      <ServiceBadge carId={props.car.id} />
    </div>
  )
}
